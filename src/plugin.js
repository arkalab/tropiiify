'use strict'

const { IIIFBuilder } = require('iiif-builder');
const collectionBuilder = new IIIFBuilder();
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
    console.log('Raw export:', data)
    this.context.logger.trace('Called export hook from IIIF Builder plugin')

    // Prompt user to select output directory
    this.options['output'] = await this.prompt()

    const expanded = await this.context.json.expand(data)
    console.log("Expanded data:", expanded)

    // Map property URIs to template labels (that should be named according to the convention)
    const map = this.mapLabelsToIds(this.loadTemplate(this.options.itemTemplate))
    const items = expanded[0]['@graph'].map((item) => new Resource(item, map, this.options))
    // Iterate over items, create manifest and write file
    for (let item of items) {
      try {
        const manifestPath = path.join(item.path, 'manifest.json')
        this.writeJson(manifestPath, await item.createManifest())
        await this.handleImages(item)
        //console.log('Manifest:', await manifest)
      } catch (e) {
        console.log(e.stack)
      }
    }
    // Create collection from same source data and write file
    const collectionPath = path.join(this.options.output, 'index.json')
    this.writeJson(collectionPath, this.createCollection(items))
    this.complete()
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
    fs.writeFile(objPath, jsonData, (err) => {
      if (err) throw err;
      console.log('The file has been saved!');
    })
    return null
  }

  createDirectory(path) {
    try {
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
        console.log(`Directory "${path}" created successfully.`);
      }
    } catch (err) {
      console.error(`Error creating directory: ${err}`);
    }
  }

  handleImages(item) {
    const imageProcessingPromises = item.photo.map(async photo => {
      const fullPath = path.join(item.path, photo.checksum, 'full', 'max', '0', `default${path.extname(photo.path) || '.jpg'}`);
      const thumbPath = path.join(item.path, photo.checksum, 'full', '!300,300', '0', `default${path.extname(photo.path) || '.jpg'}`)
      const tilesPath = path.join(item.path, photo.checksum)

      this.createDirectory(path.dirname(thumbPath))
      this.createDirectory(path.dirname(fullPath));

      const sharp = await this.context.sharp.open(photo.path, {
        limitInputPixels: true,
      })
      const resizePromise = sharp.clone().resize(300, 300, { fit: 'inside' }).toFile(thumbPath)
      const tilePromise = sharp.clone().tile({layout: 'iiif3',id: item.baseId}).toFile(tilesPath)
      const copyPromise = fs.promises.copyFile(photo.path, fullPath);
      
      await Promise.all([resizePromise, tilePromise, copyPromise])
      
      fs.unlink(path.join(item.path, 'vips-properties.xml'), (err) => {
        if (err) {
          console.error(`Error deleting file: ${err}`);
        } else {
          console.log(`Deleted vips-properties successfully.`);
        }
      })
    });
    return Promise.all(imageProcessingPromises)
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
