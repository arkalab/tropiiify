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
    console.time('Total export time')
    //console.log('Raw export:', data)
    this.context.logger.trace('Called export hook from IIIF Builder plugin')

    // Prompt user to select output directory
    this.options['output'] = await this.prompt()

    const expanded = await this.context.json.expand(data)
    //console.log("Expanded data:", expanded)

    // Map property URIs to template labels (that should be named according to the convention)
    const map = this.mapLabelsToIds(this.loadTemplate(this.options.itemTemplate))
    const items = expanded[0]['@graph'].map((item) => new Resource(item, map, this.options))
    // Iterate over items, create manifest and write file
    for (let item of items) {
      try {
        console.time('Total item time')

        const manifestPath = path.join(item.path, 'manifest.json')
        const sizes = await this.handleImages(item)
                const manifest = await item.createManifest(sizes)
        
                item.latitude && item.longitude && this.addNavPlace(manifest, item)
        
                this.writeJson(manifestPath, manifest)
                console.timeEnd('Total item time')
      } catch (e) {
        console.log(e.stack)
      }
    }
    // Create collection from same source data and write file
    const collectionPath = path.join(this.options.output, 'index.json')
    this.writeJson(collectionPath, this.createCollection(items))
    this.complete()
    console.timeEnd('Total export time')
  }

  createCollection(items) {
    const collection = collectionBuilder.createCollection(
      this.options.baseId + 'index.json', //lowercase and no whitespace (forbid #, etc?)
      collection => {
        collection.addLabel(this.options.collectionName)
        for (let item of items) {
          const id = this.options.baseId + item.id + '/manifest.json'
          collection.createManifest(id, (manifest) => {
            manifest.addLabel(item.label);
          })
        }
      })
    return collectionBuilder.toPresentation3({ id: collection.id, type: 'Collection' });
  }

  mapLabelsToIds(template) {
    let map = {}
    for (let { label, property } of template.fields) {
      label
        .split('|')
        .map((label) => label.replaceAll(/:(\w)/g, (_, char) => char.toUpperCase()))
        .map((label) => map[label] = property)
    }
    return map
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
  
      // Thumbnail
            const thumbSize = await this.processImage(sharpInstance.clone(), 300, item, photo);
        
      // Midsize
            const midSize = await this.processImage(sharpInstance.clone(), 1200, item, photo);
        
      // Tile
      await sharpInstance.clone().tile({ layout: 'iiif3', id: item.baseId }).toFile(tilesPath);
      await fs.promises.unlink(path.join(item.path, 'vips-properties.xml'));
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
    output = path.join(output[0], 'iiif')
    this.createDirectory(output)
    return output
  }

  async complete() {
    await this.context.dialog.notify('export.complete', {
      message: 'Export complete!',
      type: 'info'
    })
  }
}


TropiiifyPlugin.defaults = {
  itemTemplate: 'Export IIIF 2',
  collectionName: 'My IIIF Collection',
  homepageLabel: 'Object homepage',
  requiredStatementLabel: 'Attribution',
  requiredStatementText: 'Provided by',
  baseId: 'http://localhost:8887/iiif/',
}

module.exports = TropiiifyPlugin
