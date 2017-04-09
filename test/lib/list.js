'use strict'

const expect = require('expect.js')

const lists = require('../../src/app/js/lib/list')

const ENTRY_STRING = '1234 CREATE g:123 note|fff'
const ENTRY_DATA = { time: new Date(1234), command: 'CREATE', user: 'g:123', data: 'note|fff' }

const LIST_STRING = 'Example List\ngh:1234\n' + ENTRY_STRING
const LIST_DATA = { name: 'Example List', user: 'gh:1234' }

describe('ListModification', () => {
  describe('pattern', () => {
    it('should parse a entry string', () => {
      const data = lists.ListModification.pattern.exec(ENTRY_STRING)

      expect(data[1]).to.be('' + ENTRY_DATA.time.getTime())
      expect(data[2]).to.be(ENTRY_DATA.command)
      expect(data[3]).to.be(ENTRY_DATA.user)
      expect(data[4]).to.be(ENTRY_DATA.data)
    })
  })

  describe('<init>', () => {
    it('should fail if input is non-string', () => {
      try {
        const e = new lists.ListModification()
        expect().fail(e)
      } catch (e) {
        expect(e.message).to.match(/^expected string data/)
      }
    })

    it('should parse data', () => {
      const entry = new lists.ListModification(ENTRY_STRING)

      expect(entry.time).to.be.a(Date)
      expect(entry.time.getTime()).to.be(ENTRY_DATA.time.getTime())

      expect(entry.handler.command).to.be(ENTRY_DATA.command)
      expect(entry.user).to.be(ENTRY_DATA.user)
      expect(entry.data).to.be(ENTRY_DATA.data)
    })

    it('should throw an error if the entry string is invalid', () => {
      try {
        const e = new lists.ListModification('foo')
        expect.fail(e)
      } catch (e) {
        expect(e.message).to.match(/^bad entry line/)
      }
    })

    it('should throw an error if the command is unknown', () => {
      try {
        const e = new lists.ListModification('1 FOO f:1 bar')
        expect.fail(e)
      } catch (e) {
        expect(e.message).to.match(/^unknown command/)
      }
    })
  })

  describe('#resolveUser()', () => {
    it('should return a promise', () => {
      const entry = new lists.ListModification(ENTRY_STRING)

      expect(entry.resolveUser()).to.be.a(Promise)
    })
  })

  describe('#apply()', () => {
    it('should execute handler with target and data', () => {
      const entry = new lists.ListModification(ENTRY_STRING)

      const list = new lists.List('foo', 'bar')
      entry.apply(list) // the CREATE command is in the ENTRY_STRING input

      expect(list.entries.length).to.be(1)
    })
  })

  describe('#toString()', () => {
    it('should serialize into input data', () => {
      const entry = new lists.ListModification(ENTRY_STRING)
      expect(entry.toString()).to.be(ENTRY_STRING)
    })
  })
})

// -----------------------------------------------------------------------------------------------------

describe('ListEntry', () => {
  describe('<init>', () => {
    it('should create entry from data', () => {
      const title = 'Foo'
      const type = 'note'

      const entry = new lists.ListEntry(type, title)

      expect(entry.type).to.be(type)
      expect(entry.title).to.be(title)
    })
  })

  describe('#appendChange()', () => {
    it('should append a given change', () => {
      const entry = new lists.ListEntry('Foo', 'note')

      entry.appendChange(ENTRY_DATA.time, ENTRY_DATA.user, ENTRY_DATA.command)

      expect(entry.changes.length).to.be(1)
      expect(entry.changes[0].time.getTime()).to.be(ENTRY_DATA.time.getTime())
      expect(entry.changes[0].user).to.be(ENTRY_DATA.user)
      expect(entry.changes[0].type).to.be(ENTRY_DATA.command)
    })
  })

  describe('#appendModification', () => {
    it('should append a given modification', () => {
      const entry = new lists.ListEntry('Foo', 'note')

      entry.appendModification(new lists.ListModification(ENTRY_STRING))

      expect(entry.changes.length).to.be(1)
      expect(entry.changes[0].time.getTime()).to.be(ENTRY_DATA.time.getTime())
    })
  })
})

// -----------------------------------------------------------------------------------------------------

describe('List', () => {
  describe('parseList', () => {
    it('should create a list', () => {
      const list = lists.List.parseList('foo', LIST_STRING)

      expect(list.uuid).to.be('foo')
      expect(list.title).to.be(LIST_DATA.name)

      expect(list.users.length).to.be(1)
      expect(list.modifications.length).to.be(1)
    })
  })

  describe('<init>', () => {
    it('should create a list', () => {
      const list = new lists.List(undefined, LIST_DATA.name, LIST_DATA.user)

      expect(list.users).to.be.an(Array)
      expect(list.users[0]).to.be(LIST_DATA.user)

      expect(list.title).to.be(LIST_DATA.name)
    })
  })

  describe('#addModification()', () => {
    let list

    before(() => {
      list = new lists.List(undefined, 'Title')
    })

    it('should add a mod to the list', () => {
      list.addModification(new lists.ListModification('33 CREATE gh:123 note|foo'))

      expect(list.modifications.length).to.be(1)
    })

    it('should sort the modifications by time', () => {
      list.addModification(new lists.ListModification('22 CREATE gh:123 note|foo'))
      // same list as previous test, so we have two modifications now

      expect(list.modifications.length).to.be(2)
      expect(list.modifications[0].time.getTime()).to.be(22)
    })
  })

  describe('#addEntry()', () => {
    it('should add an entry to the list', () => {
      const list = new lists.List(undefined, '')
      list.addEntry(new lists.ListEntry('foo', 'note'))

      expect(list.entries.length).to.be(1)
    })
  })

  describe('#apply()', () => {
    it('should call the apply method for modification at index', () => {
      const list = new lists.List(undefined, '')
      list.addModification(new lists.ListModification(ENTRY_STRING))
      list.apply(0)

      expect(list.entries.length).to.be(1)
    })
  })

  describe('#applyFrom()', () => {
    it('should call apply for all modifications', () => {
      const list = new lists.List(undefined, '')

      list.addModification(new lists.ListModification(ENTRY_STRING))
      list.addModification(new lists.ListModification(ENTRY_STRING))

      let i = 0
      list.apply = index => {
        expect(index).to.be(i++)
      }

      list.applyFrom()
    })
  })

  describe('#reset()', () => {
    it('should empty entries and call #applyFrom()', () => {
      const list = new lists.List(undefined, '')
      list.addEntry(new lists.ListEntry('foo', 'note'))

      expect(list.entries.length).to.be(1)

      list.applyFrom = () => {
        expect(list.entries.length).to.be(0)
      }

      list.reset()
    })
  })

  describe('#resolveUsers()', () => {
    it('should return a promise', () => {
      const list = new lists.List(undefined, '')

      expect(list.resolveUsers()).to.be.a(Promise)
    })
  })

  describe('#isShared', () => {
    it('should return true if and only if there are multiple users', () => {
      const list = new lists.List(undefined, '', 'u1')

      expect(list.isShared()).to.be(false)

      list._users.push('u2')

      expect(list.isShared()).to.be(true)
    })
  })

  describe('#toString()', () => {
    it('should serialize the list', () => {
      const list = new lists.List(undefined, LIST_DATA.name, LIST_DATA.user)
      list.addModification(new lists.ListModification(ENTRY_STRING))

      expect(list.toString()).to.be(LIST_STRING)
    })
  })
})
