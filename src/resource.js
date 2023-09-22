class Resource {

  constructor(data = {}, map) {
    this.data = data
    this.map = map

    for (let property in map) {
      this[property] = this.extractValue(data, map[property]) //
    }

    console.log('Constructed object:', this)
  }

  extractValue(data, property) {
    return data[property]?.[0]['@value'];
  }

  assembleHTML(property) {
    const LINK = /([\w\s]+) \[(http.+)\]/gi
    return this[property].replace(LINK, '<a href="$2" target="_blank">$1</a>')
  }
}

module.exports = { Resource }