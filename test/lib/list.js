'use strict'

const expect = require('expect.js')

const lists = require('../../src/app/js/lib/list')

const ENTRY_STRING = '1234 CREATE g:123 fff'
const ENTRY_DATA = { time: new Date(1234), command: 'CREATE', user: 'g:123', data: 'fff' }

const LIST_STRING = 'Example List\ngh:1234\n' + ENTRY_STRING
const LIST_DATA = { name: 'Example List', user: 'gh:1234' }

describe('ListModificationEntry', () => {
  let list

  beforeEach(() => {
    list = new lists.List(LIST_DATA)
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

    it('should throw an error if data is neither string nor object', () => {
      try {
        const e = new lists.ListModificationEntry(list, 0)
        expect.fail(e)
      } catch (e) {
        expect(e.message).to.match(/^data must be/)
      }
    })

    it('should throw an error if the entry string is invalid', () => {
      try {
        const e = new lists.ListModificationEntry(list, 'foo')
        expect.fail(e)
      } catch (e) {
        expect(e.message).to.match(/^Bad entry line/)
      }
    })

    it('should throw an error if the command is unknown', () => {
      try {
        const e = new lists.ListModificationEntry(list, '1 FOO f:1 bar')
        expect.fail(e)
      } catch (e) {
        expect(e.message).to.be('Unknown command')
      }
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

  describe('#toString()', () => {
    let entry

    beforeEach(() => {
      entry = new lists.ListModificationEntry(list, ENTRY_STRING)
    })

    it('should serialize into input data', () => {
      expect(entry.toString()).to.be(ENTRY_STRING)
    })
  })
})

describe('List', () => {
  describe('<init>', () => {
    it('should parse string into list data', () => {
      const l = new lists.List(LIST_STRING)

      expect(l.name).to.be(LIST_DATA.name)
      expect(l.users[0]).to.be(LIST_DATA.user)
      expect(l.entries.length).to.be(1)
    })

    it('should create empty objects if not supplied', () => {
      const l = new lists.List({ name: 'foo' })

      expect(l.users).to.be.an(Array)
      expect(l.users.length).to.be(0)
      expect(l.entries).to.be.an(Array)
      expect(l.entries.length).to.be(0)
    })
  })

  describe('#addEntry', () => {
    let list

    beforeEach(() => {
      list = new lists.List(LIST_DATA)
    })

    it('should add an entry to the list', () => {
      list.addEntry(new lists.ListModificationEntry(list, ENTRY_DATA))
      expect(list.entries.length).to.be(1)
    })

    it('should throw an error if input is not a list', () => {
      expect(list.addEntry)
        .to.throwException(/^Entry must/)
    })
  })

  describe('#resolveUsers', () => {
    it('should return a promise', () => {
      const list = new lists.List(LIST_DATA)
      expect(list.resolveUsers()).to.be.a(Promise)
    })
  })

  describe('#toString', () => {
    it('should serialize the list', () => {
      const list = new lists.List(LIST_STRING)
      expect(list.toString()).to.be(LIST_STRING)
    })
  })
})
