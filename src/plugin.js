'use strict'

const { IIIFBuilder } = require('iiif-builder');
const manifestBuilder = new IIIFBuilder();
const collectionBuilder = new IIIFBuilder();
const { writeFile } = require('fs/promises')
const { Resource } = require('./resource')
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
    let destination = await this.prompt()
    destination = path.join(destination[0], 'iiif')
    this.createDirectory(destination)

    const expanded = await this.context.json.expand(data)
    console.log("Expanded data:", expanded)

    // Map property URIs to template labels (that should be named according to the convention)
    const iMap = this.mapLabelsToIds(this.loadTemplate(this.options.itemTemplate))
    const items = expanded[0]['@graph'].map((item) => new Resource(item, iMap))

    // Iterate over items, create manifest and write file
    for (let item of items) {
      try {
        const manifest = this.createManifest(item)
        console.log('Manifest:', await manifest)
        const manifestJson = JSON.stringify(await manifest, null, 4)
        const manifestPath = path.join(destination, this.sanitizeString(item.id))
        this.createDirectory(manifestPath)
        writeFile(
          path.join(
            manifestPath,
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
    const collectionPath = path.join(destination, 'collection')
    this.createDirectory(collectionPath)
    writeFile(
      path.join(
        collectionPath,
        'collection.json'
      ),
      collectionJson)
    console.log('Collection:', await collection)
  }

  async createManifest(item) {
    const id = this.options.baseId + item.id + '/manifest.json'
    const normalizedManifest = manifestBuilder.createManifest(
      id,
      manifest => {
        manifest.addLabel(item.label);
        item.summary && manifest.addSummary(item.summary)
        item.rights && manifest.setRights(item.rights);
        item.requiredstatementValue && manifest.setRequiredStatement({
          label: this.options.requiredStatementLabel,
          value: `${this.options.requiredStatementText} ${item.requiredstatementValue}`.trim() //Remove eventual leading whitespace
        })
        manifest.setHomepage({
          id: item.homepageValue,
          type: 'Text',
          label: { "none": [this.options.homepageLabel] }, //Falls back to default
          format: 'text/html'
        })
        //manifest.addSeeAlso()
        //manifest.addThumbnail()
        //props.latitude && props.longitude && manifest.addNavPlace(latitude, longitude)
        this.fillMetadata(item, manifest) //assigns all item.metadata{{Label}} props      
      }
    )
    return manifestBuilder.toPresentation3({ id: normalizedManifest.id, type: 'Manifest' });
  }

  createCollection(items) {
    const collection = collectionBuilder.createCollection(
      this.options.baseId + 'collection/' + this.sanitizeString(this.options.collectionName), //lowercase and no whitespace (forbid #, etc?)
      collection => {
        collection.addLabel(this.options.collectionName)
        for (let item of items) {
          const id = this.options.baseId + item.id + '/manifest.json'
          collection.createManifest(id, (manifest) => {
            manifest.addLabel(item.title);
          })
        }
      })
    return collectionBuilder.toPresentation3({ id: collection.id, type: 'Collection' });
  }

  fillMetadata(item, manifest) {
    for (let property in item) {
      if (property.startsWith('metadata')) {
        manifest.addMetadata(
          property.replace('metadata', ''),
          item.assembleHTML(property)
        )
      }
    }
  }

  createDirectory(path) {
    if (!fs.existsSync(path)) {
      fs.mkdir(path, (err) => {
        if (err) {
          console.error(`Error creating directory: ${err}`);
        } else {
          console.log(`Directory "${path}" created successfully.`);
        }
      });
    }
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
  photoTemplate: '',
  collectionName: 'My IIIF Collection',
  homepageLabel: 'Object homepage',
  requiredStatementLabel: 'Attribution',
  requiredStatementText: 'Provided by',
  baseId: 'http://localhost:8887/iiif/',
}

module.exports = TropyIIIFBuilderPlugin
