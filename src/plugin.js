'use strict'

const { IIIFBuilder } = require('iiif-builder');
const collectionBuilder = new IIIFBuilder();
const { writeFile, copyFile } = require('fs')
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
        this.copyImages(item)
        this.tileImages(item)
        //console.log('Manifest:', await manifest)
      } catch (e) {
        console.log(e.stack)
        //     // this.context.logger.warn(
        //     //   {
        //     //     stack: e.stack
        //     //   },
        //     //   `failed to export IIIF manifest ${item}`
        //     // )
      }
    }
    // Create collection from same source data and write file
    const collectionPath = path.join(this.options.output, 'index.json')
    this.writeJson(collectionPath, this.createCollection(items))
    //console.log('Collection:', await collection)
  }

  createCollection(items) {
    const collection = collectionBuilder.createCollection(
      this.options.baseId + 'collection/' + Resource.sanitizeString(this.options.collectionName), //lowercase and no whitespace (forbid #, etc?)
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
    await this.createDirectory(path.dirname(objPath))
    writeFile(objPath, jsonData)
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

  copyImages(item) {
    item.photo.forEach((photo) => {
      const dest = path.join(item.path, photo.checksum, 'full', 'max', '0', `default${path.extname(photo.path)}`);
      this.createDirectory(path.dirname(dest));
      fs.copyFileSync(photo.path, dest);
    });
  }

  tileImages(item) {
    try {
      item.photo.map(async (photo) => {
        const tilesPath = path.join(item.path, photo.checksum)
        const sharp = await this.context.sharp.open(photo.path, {
          limitInputPixels: true,
        })
        sharp
          .tile({
            layout: 'iiif3',
            id: item.baseId
          })
          .toFile(tilesPath)
          fs.unlink(path.join(item.path,'vips-properties.xml'), (err) => {
            if (err) {
              console.error(`Error deleting file: ${err}`);
            } else {
              console.log(`Deleted vips-properties successfully.`);
            }
          });
      })
    } catch {
      this.context.logger.trace(`Failed image tile ${item.id}`)
    }
  }

  async prompt() {
    let output = await this.context.dialog.open({
      properties: ['openDirectory']
    })
    output = path.join(output[0], 'iiif')
    this.createDirectory(output)
    return output
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
