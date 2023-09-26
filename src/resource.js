const { IIIFBuilder } = require('iiif-builder');
const manifestBuilder = new IIIFBuilder();
const path = require('path');

const ns = (namespace) => (property) => `${namespace}${property}`;

// Create an alias for the namespace
const tropy = ns('https://tropy.org/v1/tropy#');

class Resource {

  static sanitizeString(str) {
    return str.replaceAll(' ', '_').toLowerCase()
  }

  constructor(data = {}, map, options = {}) {
    //this.data = data
    //this.map = map
    Object.assign(this, options)

    for (let property in map) {
      this[property] = this.extractValue(data, map[property]) //Must/should have an 'id' prop
    }

    const cleanId = Resource.sanitizeString(this.id)
    this.path = path.join(this.output, cleanId) //manifest filesystem path
    this.baseId = new URL(`/iiif/${cleanId}`, this.baseId)  //manifest URI

    this.photo = this.extractValue(data, tropy('photo')).map((photo) => ({
      checksum: this.extractValue(photo, tropy('checksum')),
      width: this.extractValue(photo, tropy('width')),
      height: this.extractValue(photo, tropy('height')),
      mimetype: this.extractValue(photo, tropy('mimetype')),
      path: this.extractValue(photo, tropy('path'))
    }))

    //this.manifest3 = undefined
    console.log('Constructed object:', this)
  }

  extractValue(data, property) {
    return data[property]?.[0]['@value'] || data[property]?.[0]['@list'];
  }

  assembleHTML(property) {
    const LINK = /([\w\s]+) \[(http.+)\]/gi
    return this[property].replace(LINK, '<a href="$2" target="_blank">$1</a>')
  }

  fillMetadata(manifest) {
    for (let property in this) {
      if (property.startsWith('metadata') && this[property]) {
        manifest.addMetadata(
          property.replace('metadata', ''),
          this.assembleHTML(property)
        )
      }
    }
  }

  async createManifest() {
    const normalizedManifest = manifestBuilder.createManifest(
      new URL ('/manifest.json', this.baseId).toString(),
      manifest => {
        manifest.addLabel(this.label);
        this.summary && manifest.addSummary(this.summary)
        this.rights && manifest.setRights(this.rights);
        this.requiredstatementValue && manifest.setRequiredStatement({
          label: this.requiredStatementLabel,
          value: `${this.requiredStatementText} ${this.assembleHTML('requiredstatementValue')}`.trim() //Remove eventual leading whitespace
        })
        manifest.setHomepage({
          id: this.homepageValue,
          type: 'Text',
          label: { "none": [this.homepageLabel] }, //Falls back to default
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

  createCanvases(manifest) {
    for (let [index, photo] of this.photo.entries()) {
      const canvasId = new URL (`/canvas/${index}`, this.baseId).toString()
      const annPageId = new URL (`/annotation-page/${index}`, canvasId).toString()
      const annId = new URL (`/annotation/${index}`, canvasId).toString()
      const bodyId = new URL (`/${photo.checksum}/${photo.checksum}${path.extname(photo.path)}`, this.baseId).toString()
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

module.exports = { Resource }