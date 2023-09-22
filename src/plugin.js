'use strict'

const { IIIFBuilder } = require('iiif-builder');
const manifestBuilder = new IIIFBuilder();
const collectionBuilder = new IIIFBuilder();
const { writeFile } = require('fs/promises')
const { Resource } = require('./resource')
const path = require('path');
const fs = require('fs');


// A Tropy plugin is a regular Node.js module. Because of the way the plugin
// is loaded into Tropy this has to be a CommonJS module. You can use `require`
// to access the Node.js and Electron APIs or any files bundled with your plugin.

class TropyIIIFBuilderPlugin {

  // A Tropy plugin is JavaScript class/constructor function. An instance will be
  // created at start-up in each project window for each set of `options` configured
  // in the plugin section of Tropy's preferences window.
  constructor(options, context) {

    // It is good practice to define a default configuration to use as a fallback
    // in case some options are left blank.
    this.options = Object.assign({}, TropyIIIFBuilderPlugin.defaults, options)

    // The plugin instance receives a `context` object from Tropy. Typically,
    // you will store a reference here, so that you can use it later when a
    // hook is triggered.
    this.context = context

    // The sample plugin just prints the constructor arguments to the console
    // for instructional purposes. You can see it in Tropy if you reload the
    // project window while the DevTools are open.
    console.log('Constructed example plugin with options and context:')
    console.log(this.options)
    console.log(this.context)
  }

  // This method gets called when the export hook is triggered.
  async export(data) {
    console.log('Raw export:', data)
    // Here we write directly to Tropy's log file (via the context object)
    this.context.logger.trace('Called export hook from IIIF Builder plugin')

    let destination = await this.prompt()
    destination = path.join(destination[0], 'iiif')
    this.createDirectory(destination)

    // This logs the data supplied to the export hook. The data includes
    // the currently selected Tropy items (or all items, if none are currently
    // selected and you triggered the export via the menu).
    const expanded = await this.context.json.expand(data)
    console.log("Expanded data:", expanded)
    const iMap = this.mapLabelsToIds(this.loadTemplate(this.options.itemTemplate))
    const items = expanded[0]['@graph'].map((item) => new Resource(item, iMap))
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
    //zip.file(`${this.options.collectionName}`, collection)
  }

  async createManifest(item) {
    //let itemTemplate = this.loadTemplate(this.options.itemTemplate)
    //let photoTemplate = this.loadTemplate(this.options.photoTemplate)

    const id = this.options.baseId + item.id + '/manifest.json'

    const normalizedManifest = manifestBuilder.createManifest(
      id,
      manifest => {
        manifest.addLabel(item.label);
        item.summary && manifest.addSummary(item.summary)
        item.rights && manifest.setRights(item.rights);
        item.requiredstatementValue && manifest.setRequiredStatement({
          label: this.options.requiredStatementLabel,
          value: `${this.options.requiredStatementText || ''} ${item.requiredstatementValue}`.trim()
        })
        manifest.setHomepage({ id: item.homepageValue, type: 'Text', label: { "none": [item.homepageLabel] }, format: 'text/html' })
        //manifest.addSeeAlso()
        //manifest.addThumbnail()
        //props.latitude && props.longitude && manifest.addNavPlace(latitude, longitude)
        this.fillMetadata(item, manifest)
      }
    )
    return manifestBuilder.toPresentation3({ id: normalizedManifest.id, type: 'Manifest' });
  }

  createCollection(items) {
    const collection = collectionBuilder.createCollection(
      this.options.baseId + 'collection/' + this.sanitizeString(this.options.collectionName),
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
        manifest.addMetadata(property.replace('metadata', ''), item[property])
      }
    }
    // for (let { label } of template.fields) {
    //   const value = item['data'][iMap[label]]
    //   if (value && !item[label.toLowerCase()]) { //only write metadata that is not a Resource property
    //     manifest.addMetadata(this.toTitleCase(label), value[0]?.['@value']);
    //   }
    // }
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

  toTitleCase(str) {
    return str.toLowerCase().split(' ').map(function (word) {
      return (word.charAt(0).toUpperCase() + word.slice(1));
    }).join(' ');
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
      //'metadata:Source|homepage:label|provider:homepage:label' =>
      //['metadata:Source', 'homepage:label', 'provider:homepage:label'] =>
      //[
      //  ['metadataSource'], ['homepageLabel'], ['providerHomepageLabel]
      //]
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

  /* This method gets called when the import hook is triggered.
  async import(payload) {
    this.logger.trace('Called import hook from example plugin')

    // This logs the payload received by the import hook. After this method
    // completes, Tropy's import command will continue its work with this
    // payload.
    console.log(payload)

    // After this method completes, Tropy's import command will continue its
    // work with this payload. To have Tropy import JSON-LD data, you can
    // add it here:
    payload.data = [
      // Add your items here!
    ]

    // Alternatively, to import a list of supported local files or remote
    // URLs you can add the respective arrays instead:
    //
    // payload.files = []
    // payload.urls = []
  }*/
}

TropyIIIFBuilderPlugin.defaults = {
  itemTemplate: 'Export IIIF 2',
  photoTemplate: '',
  collectionName: 'My IIIF Collection',
  homepageLabel: 'Object homepage',
  requiredStatementLabel: 'Attribution',
  //requiredStatementText: 'Provided by',
  baseId: 'http://localhost:8887/iiif/',
}

// The plugin must be the module's default export.
module.exports = TropyIIIFBuilderPlugin
