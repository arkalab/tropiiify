const { IIIFBuilder } = require('iiif-builder');
const manifestBuilder = new IIIFBuilder();
const { default: json } = require("@rollup/plugin-json");
const path = require('path');
const fs = require('fs');


function createDirectory(path) {
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

const ns = (namespace) => (property) => `${namespace}${property}`;

function blank(value) {
  return value == null || value.length === 0
}

// Create an alias for the namespace
const tropy = ns('https://tropy.org/v1/tropy#');

class Resource {

  constructor(data = {}, map, json) {
    this.data = data
    this.map = map
    //this.photo = this.extractValue(data, '')

    for (let property in map) {
      this[property] = this.extractValue(data, map[property]) //
    }

    this.photo = data['https://tropy.org/v1/tropy#photo'][0]['@list'].map((photo) => ({
      checksum: this.extractValue(photo, tropy('checksum')),
      width: this.extractValue(photo, tropy('width')),
      height: this.extractValue(photo, tropy('height')),
      mimetype: this.extractValue(photo, tropy('mimetype')),
      path: this.extractValue(photo, tropy('path'))
    }))
    //{photo[property] = this.extractValue(data, tropy(property))})

    console.log('Constructed object:', this)
  }

  extractValue(data, property) {
    return data[property]?.[0]['@value'];
  }

  assembleHTML(property) {
    const LINK = /([\w\s]+) \[(http.+)\]/gi
    return this[property].replace(LINK, '<a href="$2" target="_blank">$1</a>')
  }

  async createManifest(options) {
    this.baseId = options.baseId + this.id
    const normalizedManifest = manifestBuilder.createManifest(
      this.baseId + '/manifest.json',
      manifest => {
        manifest.addLabel(this.label);
        this.summary && manifest.addSummary(this.summary)
        this.rights && manifest.setRights(this.rights);
        this.requiredstatementValue && manifest.setRequiredStatement({
          label: options.requiredStatementLabel,
          value: `${options.requiredStatementText} ${this.assembleHTML('requiredstatementValue')}`.trim() //Remove eventual leading whitespace
        })
        manifest.setHomepage({
          id: this.homepageValue,
          type: 'Text',
          label: { "none": [options.homepageLabel] }, //Falls back to default
          format: 'text/html'
        })
        //manifest.addSeeAlso()
        //manifest.addThumbnail()
        //props.latitude && props.longitude && manifest.addNavPlace(latitude, longitude)
        this.fillMetadata(manifest) //assigns all this.metadata{{Label}} props  
        this.createCanvases(manifest)
      }
    )
    return manifestBuilder.toPresentation3({ id: normalizedManifest.id, type: 'Manifest' });
  }

  fillMetadata(manifest) {
    for (let property in this) {
      if (property.startsWith('metadata')) {
        manifest.addMetadata(
          property.replace('metadata', ''),
          this.assembleHTML(property)
        )
      }
    }
  }

  createCanvases(manifest) {
    for (let [index, photo] of this.photo.entries()) {
      const canvasId = this.baseId + `/canvas/${index}`
      const annPageId = canvasId + `/annotation-page/${index}`
      const annId = canvasId + `/annotation/${index}`
      const bodyId = this.baseId + `/${photo.checksum}/${photo.checksum}${path.extname(photo.path)}`
      //createDirectory(bodyId)
      //fs.copyFile(photo.path, )
      manifest.createCanvas(canvasId, (canvas) => {
        canvas.width = photo.width;
        canvas.height = photo.height;
        canvas.createAnnotation(annPageId,
          {
            id: annId,
            type: 'Annotation',
            motivation: 'painting',
            body: {
              id: bodyId,
              type: 'Image',
              format: photo.mimetype,
              width: photo.width,
              height: photo.height
            }
          }
        )
      }
      )
    }
  }
}

module.exports = { Resource, createDirectory }