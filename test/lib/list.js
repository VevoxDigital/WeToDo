'use strict'

const expect = require('expect.js')

const lists = require('../../src/app/js/lib/list')

const ENTRY_STRING = '1234 CREATE g:123 fff'
const ENTRY_DATA = { time: new Date(1234), command: 'CREATE', user: 'g:123', data: 'fff' }

describe('ListModificationEntry', () => {
  let list

  beforeEach(() => {
    list = new lists.List()
  })

  describe('pattern', () => {
    it('should parse a entry string', () => {
      const data = lists.ListModificationEntry.pattern.exec(ENTRY_STRING)

      expect(data[1]).to.be('' + ENTRY_DATA.time.getTime())
      expect(data[2]).to.be(ENTRY_DATA.command)
      expect(data[3]).to.be(ENTRY_DATA.user)
      expect(data[4]).to.be(ENTRY_DATA.data)
    })
  })

  describe('<init>', () => {
    it('should fail if a list is not provided', () => {
      try {
        const e = new lists.ListModificationEntry()
        expect().fail(e)
      } catch (e) {
        expect(e.message.match(/^Given list/)).to.be.ok()
      }
    })

    it('should parse data', () => {
      const entry = new lists.ListModificationEntry(list, ENTRY_STRING)

      expect(entry.time).to.be.a(Date)
      expect(entry.time.getTime()).to.be(ENTRY_DATA.time.getTime())

      expect(entry.command).to.be(ENTRY_DATA.command)
      expect(entry.user).to.be(ENTRY_DATA.user)
      expect(entry.data).to.be(ENTRY_DATA.data)
    })
  })

  describe('#resolveUser()', () => {
    let entry

    beforeEach(() => {
      entry = new lists.ListModificationEntry(list, ENTRY_STRING)
    })

    it('should return a promise', () => {
      expect(entry.resolveUser()).to.be.a(Promise)
    })
  })
})
