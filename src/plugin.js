'use strict'

const { IIIFBuilder } = require('iiif-builder');
const manifestBuilder = new IIIFBuilder();
const collectionBuilder = new IIIFBuilder();
const { writeFile, copyFile } = require('fs/promises')
const { Resource, createDirectory } = require('./resource')
const path = require('path');
const fs = require('fs');


class TropyIIIFBuilderPlugin {

  constructor(options, context) {

    this.options = Object.assign({}, TropyIIIFBuilderPlugin.defaults, options)
    this.context = context

    console.log('Constructed example plugin with options and context:')
    console.log(this.options)
    console.log(this.context)
  }

  async export(data) {
    console.log('Raw export:', data)
    this.context.logger.trace('Called export hook from IIIF Builder plugin')

    // Prompt user to select output directory
    let output = await this.prompt()
    output = path.join(output[0], 'iiif')
    createDirectory(output)

    const expanded = await this.context.json.expand(data)
    console.log("Expanded data:", expanded)

    // Map property URIs to template labels (that should be named according to the convention)
    const map = this.mapLabelsToIds(this.loadTemplate(this.options.itemTemplate))
    const items = expanded[0]['@graph'].map((item) => new Resource(item, map, this.context.json))

    // Iterate over items, create manifest and write file
    for (let item of items) {
      try {
        const manifest = item.createManifest(this.options)
        console.log('Manifest:', await manifest)
        const manifestJson = JSON.stringify(await manifest, null, 4)
        const itemPath = path.join(output, this.sanitizeString(item.id))
        createDirectory(itemPath)
        item.photo.map((photo) => {
          const dir = path.join(itemPath, photo.checksum)
          createDirectory(dir);
          copyFile(photo.path, path.join(dir, photo.checksum + path.extname(photo.path))) //full/max/0/default?
        });
        writeFile(
          path.join(
            itemPath,
            'manifest.json'
          ),
          manifestJson)
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
    const collection = this.createCollection(items)
    const collectionJson = JSON.stringify(await collection, null, 4)
    const collectionPath = path.join(output, 'collection')
    createDirectory(collectionPath)
    writeFile(
      path.join(
        collectionPath,
        'collection.json'
      ),
      collectionJson)
    console.log('Collection:', await collection)
  }

  createCollection(items) {
    const collection = collectionBuilder.createCollection(
      this.options.baseId + 'collection/' + this.sanitizeString(this.options.collectionName), //lowercase and no whitespace (forbid #, etc?)
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

  sanitizeString(str) {
    return str.replaceAll(' ', '_').toLowerCase()
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

  prompt() {
    return this.context.dialog.open({
      properties: ['openDirectory']
    })
  }
}

TropyIIIFBuilderPlugin.defaults = {
  itemTemplate: 'Export IIIF 2',
  photoTemplate: 'Tropy Photo',
  collectionName: 'My IIIF Collection',
  homepageLabel: 'Object homepage',
  requiredStatementLabel: 'Attribution',
  requiredStatementText: 'Provided by',
  baseId: 'http://localhost:8887/iiif/',
}

module.exports = TropyIIIFBuilderPlugin
