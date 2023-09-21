const contexts = {
  "@context": [{
    "sc": "http://iiif.io/api/presentation/2#",
    "iiif": "http://iiif.io/api/image/2#",
    "exif": "http://www.w3.org/2003/12/exif/ns#",
    "oa": "http://www.w3.org/ns/oa#",
    "cnt": "http://www.w3.org/2011/content#",
    "dc": "http://purl.org/dc/elements/1.1/",
    "dcterms": "http://purl.org/dc/terms/",
    "dctypes": "http://purl.org/dc/dcmitype/",
    "doap": "http://usefulinc.com/ns/doap#",
    "foaf": "http://xmlns.com/foaf/0.1/",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "svcs": "http://rdfs.org/sioc/services#",
    "as": "http://www.w3.org/ns/activitystreams#",
  }]
}
const ns = (prefix) => (name = '') => `${prefix}${name}`;
const alias = (ctx, name) => ns((ctx['@context'][0] || ctx['@context'])[name]);

// Create aliases for the namespaces
const dcterms = alias(contexts, 'dcterms');
const exif = alias(contexts, 'exif');

function extractValue(data, property) {
  return data[property]?.[0]['@value'];
}

class Resource {
  constructor(data = {}) {
    this.data = data
    this.identifier = extractValue(data, dcterms('identifier'));
    this.title = extractValue(data, dcterms('title'));
    this.description = extractValue(data, dcterms('description'));
    this.source = extractValue(data, dcterms('source'));
    this.rights = extractValue(data, dcterms('rights'));
    this.latitude = extractValue(data, exif('gpsLatitude'));
    this.longitude = extractValue(data, exif('gpsLongitude'));
  }
}

module.exports = { Resource }