function extractValue(data, property) {
  return data[property]?.[0]['@value'];
}

const LINK = /([\w\s]+) \[(http.+)\]/gi

function assembleHTML(string) {
  return string.replace(LINK, '<a href="$2" target="_blank">$1</a>')
}

class Resource {

  constructor(data = {}, map) {
    this.data = data //?
    this.map = map

    for (let property in map) {
      this[property] = assembleHTML(extractValue(data, map[property])) //
    }

    console.log('Constructed object:', this)
  }
}

module.exports = { Resource }