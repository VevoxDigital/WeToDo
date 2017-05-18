'use strict'

const expect = require('expect.js')

const { List, ListModification, ListEntry } = require('../../src/app/js/lib/list')
const { handlers } = require('../../src/app/js/lib/list-handlers')

describe('lib/list-handlers', () => {
  it('should contain a list of handlers', () => {
    expect(handlers).to.be.an('object')
  })

  describe('CreateCommandHandler', () => {
    // TODO Test this, even though its handled by another test
  })

  describe('DeleteCommandHandler', () => {
    it('should handle command: DELETE', () => {
      expect(handlers.DELETE.command).to.be('DELETE')
    })

    it('should delete an entry at position', () => {
      const list = new List('foo')
      list._entries.push('foo')
      list._entries.push('bar')

      expect(list._entries.length).to.be(2)

      const mod = ListModification.fromData(new Date(), handlers.DELETE.command, 'local:0', '0')
      handlers.DELETE.handle(mod, list)

      expect(list._entries.length).to.be(1)
      expect(list._entries[0]).to.be('bar')
    })
  })

  describe('CheckCommandHandler', () => {
    it('should handle command: CHECK', () => {
      expect(handlers.CHECK.command).to.be('CHECK')
    })

    it('should check the entry', () => {
      const list = new List()
      const entry = new ListEntry('check', 'Title')

      list.addEntry(entry)

      expect(entry.checked).to.not.be.ok()
      expect(entry._changes.length).to.be(0)

      const mod = ListModification.create(handlers.CHECK.command, { id: 'local:0' }, '0')
      list.addModification(mod)
      list.applyLast() // Don't use modifyAndSave(), as we do not want to save here

      expect(entry.checked).to.be.ok()
      expect(entry._changes.length).to.be(1)

      list.applyLast() // this should cause the other branch to be tested
    })
  })

  describe('RenameListCommandHandler', () => {
    it('should handle command: LISTRENAME', () => {
      expect(handlers.LISTRENAME.command).to.be('LISTRENAME')
    })

    it('should rename the list', () => {
      const list = new List('foo', 'title1')

      expect(list.title).to.be('title1')

      const mod = ListModification.fromData(new Date(), handlers.LISTRENAME.command, 'local:0', 'title2')
      handlers.LISTRENAME.handle(mod, list)

      expect(list.title).to.be('title2')
    })
  })
})
