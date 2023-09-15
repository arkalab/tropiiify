'use strict'

const assert = require('assert')

describe('ExamplePlugin', () => {
  const ExamplePlugin = require('../src/plugin')

  it('exists', () => {
    assert.equal(typeof ExamplePlugin, 'function')
  })

  it('responds to export hook', () => {
    assert.equal(typeof (new ExamplePlugin).export, 'function')
  })

  it('responds to import hook', () => {
    assert.equal(typeof (new ExamplePlugin).import, 'function')
  })
})
