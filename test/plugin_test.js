'use strict'

const assert = require('assert')

describe('TropyIIIFBuilderPlugin', () => {
  const TropyIIIFBuilderPlugin = require('../src/plugin')

  it('exists', () => {
    assert.equal(typeof TropyIIIFBuilderPlugin, 'function')
  })

  it('responds to export hook', () => {
    assert.equal(typeof (new TropyIIIFBuilderPlugin).export, 'function')
  })

  it('responds to import hook', () => {
    assert.equal(typeof (new TropyIIIFBuilderPlugin).import, 'function')
  })
})
