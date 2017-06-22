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
      list._entries.push(new ListEntry(list, 'note', 'foo'))
      list._entries.push(new ListEntry(list, 'note', 'bar'))

      expect(list._entries.length).to.be(2)

      const mod = ListModification.fromData(new Date(), handlers.DELETE.command, 'local:0', '0')
      handlers.DELETE.handle(mod, list)

      expect(list._entries.length).to.be(1)
      expect(list._entries[0].title).to.be('bar')
    })

    it('should clean up modification about this entry', () => {
      const list = new List()

      list.addModification(ListModification.create(handlers.RENAME.command, { id: 'local:0' }, '0|Test 1'))
      list.addModification(ListModification.create(handlers.DELETE.command, { id: 'local:0' }, '0'))

      expect(list._mods.length).to.be(2)

      list.applyLast()
      expect(list._mods.length).to.be(1)
    })
  })

  describe('CheckCommandHandler', () => {
    it('should handle command: CHECK', () => {
      expect(handlers.CHECK.command).to.be('CHECK')
    })

    it('should check the entry', () => {
      const list = new List()
      const entry = new ListEntry(list, 'check', 'Title')

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

  describe('RenameCommandHandler', () => {
    it('should handle command: RENAME', () => {
      expect(handlers.RENAME.command).to.be('RENAME')
    })

    it('should rename the list', () => {
      const list = new List()
      const entry = new ListEntry(list, 'check', 'title1')
      list.addEntry(entry)

      expect(entry.title).to.be('title1')

      const mod = ListModification.create(handlers.RENAME.command, { id: 'local:0' }, '0|title2')
      handlers.RENAME.handle(mod, list)

      expect(entry.title).to.be('title2')
    })
  })

  describe('RelocateCommandHandler', () => {
    it('should handle command: RENAME', () => {
      expect(handlers.RELOCATE.command).to.be('RELOCATE')
    })

    it('should sort items in list', () => {
      const list = new List()
      list.addEntry(new ListEntry(list, 'check', 'title1'))
      list.addEntry(new ListEntry(list, 'check', 'title2'))
      list.addEntry(new ListEntry(list, 'check', 'title3'))

      expect(list.entries[1].title).to.be('title2')

      const mod = ListModification.create(handlers.RELOCATE.command, { id: 'local:0' }, '2-1')
      handlers.RELOCATE.handle(mod, list)

      expect(list.entries[1].title).to.be('title3')
    })

    it('should place items at end of list if target is greater than length', () => {
      const list = new List()
      list.addEntry(new ListEntry(list, 'check', 'title1'))
      list.addEntry(new ListEntry(list, 'check', 'title2'))

      expect(list.entries[0].title).to.be('title1')

      const mod = ListModification.create(handlers.RELOCATE.command, { id: 'local:0' }, '0-2')
      handlers.RELOCATE.handle(mod, list)

      expect(list.entries[0].title).to.be('title2')
    })

    it('should do nothing if invalid', () => {
      const list = new List()
      list.addEntry(new ListEntry(list, 'check', 'title1'))
      list.addEntry(new ListEntry(list, 'check', 'title2'))

      expect(list.entries[0].title).to.be('title1')

      const mod = ListModification.create(handlers.RELOCATE.command, { id: 'local:0' }, 'foo')
      handlers.RELOCATE.handle(mod, list)

      expect(list.entries[0].title).to.be('title1')
    })
  })

  describe('ChangeDescCommandHandler', () => {
    it('should handle command: CHANGEDESC', () => {
      expect(handlers.CHANGEDESC.command).to.be('CHANGEDESC')
    })

    it('should update item\'s description', () => {
      const list = new List()
      const entry = new ListEntry(list, 'check', 'title')
      list.addEntry(entry)

      expect(entry.description).to.be(undefined)

      const mod = ListModification.create(handlers.CHANGEDESC.command, { id: 'local:0' }, '0|desc2')
      handlers.CHANGEDESC.handle(mod, list)

      expect(entry.description).to.be('desc2')
    })
  })

  describe('ClearCommandHandler', () => {
    it('should handle command: CLEAR', () => {
      expect(handlers.CLEAR.command).to.be('CLEAR')
    })

    it('should clear the list', () => {
      const list = new List()
      list.addModification(ListModification.create(handlers.CREATE.command, { id: 'local:0' }, 'note|Test1'))
      list.addModification(ListModification.create(handlers.CREATE.command, { id: 'local:0' }, 'note|Test2'))

      expect(list._mods.length).to.be(2)

      list.addModification(ListModification.create(handlers.CLEAR.command, { id: 'local:0' }))
      list.applyLast()

      expect(list._mods.length).to.be(1)
      expect(list._mods[0].handler.command).to.be(handlers.CLEAR.command)

      list.applyLast()
      expect(list._mods.length).to.be(1)
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
