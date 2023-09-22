function extractValue(data, property) {
  return data[property]?.[0]['@value'];
}

class Resource {

  constructor(data = {}, map) {
    this.data = data //?
    this.map = map

    for (let property in map) {
      this[property] = extractValue(data, map[property]) //
    }

    console.log('Constructed object:', this)
  }
}

module.exports = { Resource }