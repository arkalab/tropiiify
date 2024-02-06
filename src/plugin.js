'use strict'

const { IIIFBuilder } = require('iiif-builder');
const collectionBuilder = new IIIFBuilder();
const { writeFile } = require('fs')
const { Resource } = require('./resource')
const path = require('path');
const fs = require('fs');


class TropiiifyPlugin {

  constructor(options, context) {

    this.options = Object.assign({}, TropiiifyPlugin.defaults, options)
    this.context = context

    console.log('Constructed example plugin with options and context:')
    console.log(this.options)
    console.log(this.context)
  }

  async export(data) {
    const startTime = performance.now();
    //console.log('Raw export:', data)
    this.context.logger.trace('Called export hook from Tropiiify plugin')

    // Prompt user to select output directory, abort if canceled
    this.options['output'] = await this.prompt()
    if (this.options['output'] === null) {
      return;
    }

    const expanded = (await this.context.json.expand(data))[0]?.['@graph']
    //console.log("Expanded data:", expanded)

    // Map property URIs to template labels (that should be named according to the convention)
    const map = this.mapLabelsToIds(this.loadTemplate(this.options.itemTemplate))
    
    const items = expanded.map((item) => new Resource(item, map, this.options));
    //console.log('items', items)
    const missingIds = !items.every(item => item['id']);
    if (missingIds) {
      this.context.dialog.notify('missing.ids', {
        message: 'Every item must have an identifier. Please review your project and try again.',
        type: 'info'
      });
      return
    } else {
      this.createDirectory(this.options.output)
    }

    // Iterate over items, create manifest and write file
    for (let item of items) {
      try {
        const sizes = await this.handleImages(item)
        await fs.promises.unlink(path.join(item.path, 'vips-properties.xml'));
        const manifest = await item.createManifest(sizes)
        item.latitude && item.longitude && this.addNavPlace(manifest, item)
        const manifestPath = path.join(item.path, 'manifest.json')
        this.writeJson(manifestPath, manifest)
      } catch (e) {
        console.log(e.stack)
      }
    }

    // Create collection using the same data and write file
    const collectionPath = path.join(this.options.output, 'index.json')
    this.writeJson(collectionPath, this.createCollection(items))
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    this.complete(executionTime)
  }

  createCollection(items) {
    const collection = collectionBuilder.createCollection(
      `${this.options.baseId.replace(/\/$/, '')}/index.json`, //lowercase and no whitespace (TODO: forbid #, etc?)
      collection => {
        collection.addLabel(this.options.collectionName)
        for (let [index, item] of items.entries()) {
          const id = `${item.baseId}/manifest.json`
          collection.createManifest(id, (manifest) => {
            manifest.addLabel(item.label);
          })
          if (index === 0) {
            const { path: imagePath, checksum, width, height, mimetype } = item.photo[0]
            const ratio = Math.max(width, height) / 300
            const newWidth = Math.round(width / ratio)
            const newHeight = Math.round(height / ratio)
            collection.addThumbnail({
              id:
                `${item.baseId}/${checksum}/full/${Math.round(newWidth)},${Math.round(newHeight)}/0/default${path.extname(imagePath) || '.jpg'}`,
              type: 'Image',
              format: mimetype,
              width: newWidth,
              height: newHeight,
            })
          }
        }
      })
    return collectionBuilder.toPresentation3({ id: collection.id, type: 'Collection' });
  }

  mapLabelsToIds(template) {
    let propMap = {}
    if (!template || template.id === 'https://tropy.org/v1/templates/generic') {
      propMap = {
        id: "http://purl.org/dc/elements/1.1/identifier",
        label: "http://purl.org/dc/elements/1.1/title",
        metadataCreator: "http://purl.org/dc/elements/1.1/creator",
        metadataDate: "http://purl.org/dc/elements/1.1/date",
        metadataType: "http://purl.org/dc/elements/1.1/type",
        requiredstatementValue: "http://purl.org/dc/elements/1.1/source",
        rights: "http://purl.org/dc/elements/1.1/rights",
        summary: "http://purl.org/dc/elements/1.1/description",
      }
    } else {
      for (let { label, property } of template.fields) {
        label
          .split('|')
          .map((label) => label.replaceAll(/:(\w)/g, (_, char) => char.toUpperCase()))
          .map((label) => propMap[label] = property)
      }
    }
    return propMap
  }

  loadTemplate(id) {
    return this.context.window.store?.getState().ontology.template[id]
  }

  async writeJson(objPath, obj) {
    const jsonData = JSON.stringify(obj, null, 4)
    this.createDirectory(path.dirname(objPath))
    writeFile(objPath, jsonData, (err) => {
      if (err) throw err;
    })
    return null
  }

  createDirectory(path) {
    try {
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
        //console.log(`Directory "${path}" created successfully.`);
      }
    } catch (err) {
      console.error(`Error creating directory: ${err}`);
    }
  }

  async handleImages(item) {
    const promises = item.photo.map(async (photo) => {
      const tilesPath = path.join(item.path, photo.checksum);
      const sharpInstance = await this.context.sharp.open(photo.path, {
        limitInputPixels: true,
      });

      const thumbPromise = this.processImage(sharpInstance.clone(), 300, item, photo);
      // If larger, resize image to 2000px on the long side 
      const midsizePromise = this.processImage(sharpInstance.clone(), Math.min(2000, (Math.max(photo.width, photo.height))), item, photo);

      // Wait for both thumbnail and midsize promises to resolve
      const [thumbSize, midSize] = await Promise.all([thumbPromise, midsizePromise]);

      // Tile image
      await sharpInstance.clone().tile({ layout: 'iiif3', id: item.baseId }).toFile(tilesPath);

      // Add sizes to info.json
      const infoPath = path.join(tilesPath, 'info.json');
      const infoData = await fs.promises.readFile(infoPath, 'utf-8');
      const infoJson = JSON.parse(infoData);
      infoJson.sizes = [thumbSize, midSize];
      await fs.promises.writeFile(infoPath, JSON.stringify(infoJson, null, 2));

      return { thumb: thumbSize, midsize: midSize };
    });

    // Wait for all promises to resolve
    return Promise.all(promises);
  }


  async processImage(sharpInstance, maxDimension, item, photo) {
    const size = {};
    try {
      await new Promise((resolve, reject) => {
        sharpInstance
          .resize(maxDimension, maxDimension, { fit: 'inside' })
          .toBuffer((err, data, info) => {
            if (err) {
              console.error('Error:', err);
              reject(err);
            } else {
              const { width, height } = info;
              size.width = width;
              size.height = height;
              const destination = path.join(
                item.path,
                photo.checksum,
                'full',
                `${width},${height}`,
                '0',
                `default${path.extname(photo.path) || '.jpg'}`
              );
              fs.promises.mkdir(path.dirname(destination), { recursive: true })
                .then(() => fs.promises.writeFile(destination, data))
                .then(() => {
                  resolve(size);
                })
                .catch(reject);
            }
          });
      });
    } catch (error) {
      console.error('Error in processImage:', error);
    }
    return size;
  }

  addNavPlace(manifest, item) {
    const navPlace = {
      id: `${item.baseId}/feature-collection/0`,
      type: 'FeatureCollection',
      features: [
        {
          id: `${item.baseId}/feature/0`,
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [item.longitude, item.latitude],
          },
          properties: {
            label: [{ none: item.label }],
          },
        }]
    };
    manifest.navPlace = navPlace
  }

  async prompt() {
    let output = await this.context.dialog.open({
      properties: ['openDirectory']
    })
    if (output.length > 0) {
      output = path.join(output[0], 'iiif')
      return output
    } else {
      return null
    }
  }

  async complete(time) {
    await this.context.dialog.notify('export.complete', {
      message: `Export complete!\nIt took ${(time / 60000).toFixed(1)} minutes.`,
      type: 'info'
    })
  }
}


TropiiifyPlugin.defaults = {
  itemTemplate: 'https://tropy.org/v1/templates/generic',
  collectionName: 'My IIIF Collection',
  homepageLabel: 'Object homepage',
  requiredStatementLabel: 'Attribution',
  requiredStatementText: 'Provided by',
  baseId: 'http://127.0.0.1:8080',
}

module.exports = TropiiifyPlugin
