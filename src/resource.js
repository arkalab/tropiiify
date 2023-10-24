const { IIIFBuilder } = require('iiif-builder');
const manifestBuilder = new IIIFBuilder();
const path = require('path');

const ns = (namespace) => (property) => `${namespace}${property}`;

// Create an alias for the namespace
const tropy = ns('https://tropy.org/v1/tropy#');

class Resource {

  static sanitizeString(str) {
    return str.replaceAll(' ', '-').toLowerCase()
  }

  constructor(data = {}, map, options = {}) {
    //this.data = data
    //this.map = map
    this.options = options

    for (let property in map) {
      this[property] = this.extractValue(data, map[property]) //Must/should have an 'id' prop
    }

    this.id = Resource.sanitizeString(this.id)
    this.path = path.join(this.options.output, this.id) //manifest filesystem path
    this.baseId = `${this.options.baseId}/${this.id}` //manifest URI

    this.photo = this.extractValue(data, tropy('photo')).map((photo) => ({
      checksum: this.extractValue(photo, tropy('checksum')),
      width: this.extractValue(photo, tropy('width')),
      height: this.extractValue(photo, tropy('height')),
      mimetype: this.extractValue(photo, tropy('mimetype')),
      path: this.extractValue(photo, tropy('path'))
    }))

    //this.manifest3 = undefined
    //console.log('Constructed object:', this)
  }

  extractValue(data, property) {
    return data[property]?.[0]['@value'] || data[property]?.[0]['@list'];
  }

  assembleHTML(property) {
    const LINK = /([\w\s]+) \[(http.+)\]/gi
    return this[property].replace(LINK, '<a href="$2" target="_blank">$1</a>')
  }

  createManifest(sizes) {
    const normalizedManifest = manifestBuilder.createManifest(
      `${this.baseId}/manifest.json`,
      manifest => {
        const { width: thumbWidth, height: thumbHeight } = sizes[0].thumb
        manifest.addLabel(this.label);
        this.summary && manifest.addSummary(this.summary)
        this.rights && manifest.setRights(this.rights);
        this.requiredstatementValue && manifest.setRequiredStatement({
          label: this.options.requiredStatementLabel,
          value: `${this.options.requiredStatementText} ${this.assembleHTML('requiredstatementValue')}`.trim() //Remove eventual leading whitespace
        })
        manifest.setHomepage({
          id: this.homepageValue,
          type: 'Text',
          label: { "none": [this.options.homepageLabel] }, //Falls back to default
          format: 'text/html'
        })
        //props.latitude && props.longitude && manifest.addNavPlace(latitude, longitude)
        manifest.addThumbnail({
          id:
            `${this.baseId}/${this.photo[0].checksum}/full/${thumbWidth},${thumbHeight}/0/default${path.extname(this.photo[0].path) || '.jpg'}`, 
            type: 'Image', 
            format: this.photo[0].mimetype,
            width: thumbWidth,
            height: thumbHeight,
                    });
        this.fillMetadata(manifest) //assigns all this.metadata{{Label}} props  
        this.createCanvases(manifest, sizes)
      }
    )
    return manifestBuilder.toPresentation3({ id: normalizedManifest.id, type: 'Manifest' });
  }

  fillMetadata(manifest) {
    for (let property in this) {
      if (property.startsWith('metadata') && this[property]) {
        manifest.addMetadata(
          { "none": [property.replace('metadata', '')] },
          { "none": [this.assembleHTML(property)] },
        )
      }
    }
  }

  createCanvases(manifest, sizes) {
    for (let [index, photo] of this.photo.entries()) {
      const { width: midWidth, height: midHeight } = sizes[index].midsize
      const canvasId = `${this.baseId}/canvas/${index}`
      const annPageId = `${canvasId}/annotation-page/${index}`
      const annId = `${this.baseId}/annotation/${index}`
      const bodyId = `${this.baseId}/${photo.checksum}/full/${midWidth},${midHeight}/0/default${path.extname(photo.path) || '.jpg'}`
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
              width: midWidth,
              height: midHeight,
              service: [
                {
                  "id": `${this.baseId}/${photo.checksum}`,
                  "type": "ImageService3",
                  "profile": "http://iiif.io/api/image/3/level0.json"
                }
              ]
            }
          }
        )
      }
      )
    }
  }
}

module.exports = { Resource }