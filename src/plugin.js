'use strict'

const { IIIFBuilder } = require('iiif-builder');
const builder = new IIIFBuilder();
const { writeFile } = require('fs/promises')
const path = require('path');
//const LABELS = require('./labels.json')


// A Tropy plugin is a regular Node.js module. Because of the way the plugin
// is loaded into Tropy this has to be a CommonJS module. You can use `require`
// to access the Node.js and Electron APIs or any files bundled with your plugin.

class ExamplePlugin {

  // A Tropy plugin is JavaScript class/constructor function. An instance will be
  // created at start-up in each project window for each set of `options` configured
  // in the plugin section of Tropy's preferences window.
  constructor(options, context) {

    // It is good practice to define a default configuration to use as a fallback
    // in case some options are left blank.
    this.options = Object.assign({}, ExamplePlugin.defaults, options)

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
    // Here we write directly to Tropy's log file (via the context object)
    this.context.logger.trace('Called export hook from example plugin')

    //const destination = await this.prompt()

    // This logs the data supplied to the export hook. The data includes
    // the currently selected Tropy items (or all items, if none are currently
    // selected and you triggered the export via the menu).
    const expanded = await this.context.json.expand(data)

    let manifests = []
    //const zip = new JSZip();

    // for (let item of expanded[0]['@graph']) {
    //   try {
    //     const manifest = this.createManifest(item)
    //     //console.log('Manifest:', await manifest)
    //     const jsonData = JSON.stringify(manifest, null, 4)
    //     //writeFile(path.join(destination[0,'manifest.json'), jsonData)

    //     manifests.push(manifest)
    //     //zip.file(`${manifest.id}.json`, manifest)
    //   } catch (e) {
    //     console.log(e.stack)
    //     // this.context.logger.warn(
    //     //   {
    //     //     stack: e.stack
    //     //   },
    //     //   `failed to export IIIF manifest ${item}`
    //     // )
    //   }
    // }
    const collection = this.createCollection(expanded[0]['@graph']) //manifests
    console.log('Collection:', await collection)
    //zip.file(`${this.options.collectionName}`, collection)
  }

  async createManifest(item) {
    let itemTemplate = this.loadTemplate(this.options.itemTemplate)
    let photoTemplate = this.loadTemplate(this.options.photoTemplate)

    const props = {
      identifier: item['http://purl.org/dc/terms/identifier']?.[0]['@value'],
      title: item['http://purl.org/dc/terms/title']?.[0]['@value'],
      description: item['http://purl.org/dc/terms/description']?.[0]['@value'],
      rights: item['http://purl.org/dc/terms/rights']?.[0]['@value'],
      source: item['http://purl.org/dc/terms/source']?.[0]['@value'],
      latitude: item['http://www.w3.org/2003/12/exif/ns#gpsLatitude']?.[0]['@value'],
      longitude: item['http://www.w3.org/2003/12/exif/ns#gpsLongitude']?.[0]['@value'],
    };

    const id = this.options.baseId + props.identifier + '/manifest.json'

    const newManifest = builder.createManifest(
      id,
      manifest => {
        manifest.addLabel(props.title);
        props.description && manifest.addSummary(props.description)
        props.rights && manifest.setRights(props.rights);
        props.source && manifest.setRequiredStatement({
          label: this.options.requiredStatementLabel,
          value: this.options.requiredStatementText + ` ${props.source}`
        })
        //props.latitude && props.longitude && manifest.addNavPlace(latitude, longitude)
        this.fillMetadata(itemTemplate, item, manifest)
      }
    )
    console.log('normalized:', newManifest)

    return builder.toPresentation3({ id: newManifest.id, type: 'Manifest' });
  }

  async createCollection(manifests) {
    const collection = builder.createCollection(
      this.options.baseId + '/collection/' + this.options.collectionName.toLowerCase().replace(' ', '_'),
      async collection => {
        collection.addLabel(this.options.collectionName)
        for (let item of manifests) {
          
          // Emprestado de createManifest
          const props = {
            identifier: item['http://purl.org/dc/terms/identifier']?.[0]['@value'],
            title: item['http://purl.org/dc/terms/title']?.[0]['@value'],
            description: item['http://purl.org/dc/terms/description']?.[0]['@value'],
            rights: item['http://purl.org/dc/terms/rights']?.[0]['@value'],
            source: item['http://purl.org/dc/terms/source']?.[0]['@value'],
            latitude: item['http://www.w3.org/2003/12/exif/ns#gpsLatitude']?.[0]['@value'],
            longitude: item['http://www.w3.org/2003/12/exif/ns#gpsLongitude']?.[0]['@value'],
          };
          const id = this.options.baseId + props.identifier + '/manifest.json'
          //

          collection.createManifest(id, (manifest) => {
            //manifest.addLabel(manifest.label['none'][0])
            manifest.addLabel(props.title);
            props.description && manifest.addSummary(props.description)
            props.rights && manifest.setRights(props.rights);
            props.source && manifest.setRequiredStatement({
              label: this.options.requiredStatementLabel,
              value: this.options.requiredStatementText + ` ${props.source}`
            })
            //props.latitude && props.longitude && manifest.addNavPlace(latitude, longitude)
            //provider?
            let itemTemplate = this.loadTemplate(this.options.itemTemplate)
            this.fillMetadata(itemTemplate, item, manifest)

          })
        }
        // manifests.map(manifest => {
        //   console.log(manifest)
        //   collection.createManifest(manifest.id, (manifest) => {
        //     manifest.addLabel(manifest.label)
        //   })
        // })
      })
    return collection
  }

  fillMetadata(template, item, manifest) {
    let iMap = this.mapLabelsToIds(template)
    for (let { label } of template.fields) {
      if (item[iMap[label]]) {
        manifest.addMetadata(this.toTitleCase(label), item[iMap[label]][0]?.['@value']);
      }
    }
  }

  toTitleCase(str) {
    return str.toLowerCase().split(' ').map(function (word) {
      return (word.charAt(0).toUpperCase() + word.slice(1));
    }).join(' ');
  }

  checkAndAssign(item, field) {
    return item[field]?.[0]['@value']
  }

  sanitizeString(str) {
    return str.toLowerCase().replace(' ', '_')
  }

  mapLabelsToIds(template) {
    // if (!template)
    //   return LABELS
    let map = {}
    for (let { label, property } of template.fields) {
      if (label) map[label] = property
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

ExamplePlugin.defaults = {
  itemTemplate: '',
  photoTemplate: '',
  collectionName: 'My IIIF Collection',
  requiredStatementLabel: 'Attribution',
  requiredStatementText: 'Provided by',
}

// The plugin must be the module's default export.
module.exports = ExamplePlugin
