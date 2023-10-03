'use strict'

const assert = require('assert')

describe('TropiiifyPlugin', () => {
  const TropiiifyPlugin = require('../src/plugin')

  it('exists', () => {
    assert.equal(typeof TropiiifyPlugin, 'function')
  })

  it('responds to export hook', () => {
    assert.equal(typeof (new TropiiifyPlugin).export, 'function')
  })
})
