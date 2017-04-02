'use strict'

const expect = require('expect.js')
const fs = require('fs')
const path = require('path')

// no need to be async, it's a test
describe('Sanity Checks', () => {
  describe('Compiler', () => {
    it('should have created a target directory', () => {
      const stats = fs.statSync(path.join(__dirname, '..', 'www'))

      expect(stats).to.be.ok()
      expect(stats.isDirectory()).to.be(true)
    })
  })
})
