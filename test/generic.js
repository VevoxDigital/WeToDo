'use strict'

const expect = require('expect.js')
const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.join(__dirname, '..')
const TARGET_DIR = path.join(ROOT_DIR, 'www')

// no need to be async, it's a test
describe('Sanity Checks', () => {
  describe('Compiler', () => {
    it('should have created a target directory', () => {
      const stats = fs.statSync(TARGET_DIR)
      expect(stats).to.be.ok()
      expect(stats.isDirectory()).to.be(true)
    })

    it('should have installed bower components', () => {
      expect(fs.statSync)
        .withArgs(path.join(TARGET_DIR, 'bower.json'))
        .to.not.throwException()

      expect(fs.statSync)
        .withArgs(path.join(TARGET_DIR, 'bower_components'))
        .to.not.throwException()

      expect(fs.readFileSync(path.join(ROOT_DIR, 'bower.json')).toString())
        .to.equal(fs.readFileSync(path.join(TARGET_DIR, 'bower.json')).toString())
    })

    it('should have copied resources', () => {
      expect(fs.readdirSync(path.join(TARGET_DIR, 'resources')).length)
        .to.equal(fs.readdirSync(path.join(ROOT_DIR, 'src', 'resources')).length)
    })
  })
})
