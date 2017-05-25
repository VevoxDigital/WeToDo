'use strict'

const lists = require('./list')
const assert = require('assert')

class ListCommandHandler {
  constructor (command) {
    assert.strictEqual(typeof command, 'string')

    Object.defineProperty(this, 'command', { value: command, enumerable: true })
  }

  handle (mod, list) {
    /* istanbul ignore next */
    if (typeof window !== 'undefined') console.log(`${this.command}@${list.uuid}: ${mod.data}`)
  }
}

class CreateCommandHandler extends ListCommandHandler {
  constructor () {
    super('CREATE')
  }

  handle (mod, list) {
    super.handle(mod, list)

    const argsIndex = mod.data.indexOf('|')
    const entry = new lists.ListEntry(mod.data.substring(0, argsIndex), mod.data.substring(argsIndex + 1))
    entry.appendModification(mod)

    list.addEntry(entry)
  }
}

class DeleteCommandHandler extends ListCommandHandler {
  constructor () {
    super('DELETE')
  }

  handle (mod, list) {
    super.handle(mod, list)

    list._entries.splice(Number.parseInt(mod.data, 10), 1)
  }
}

class CheckCommandHandler extends ListCommandHandler {
  constructor () {
    super('CHECK')
  }

  handle (mod, list) {
    super.handle(mod, list)

    const entry = list.entries[Number.parseInt(mod.data, 10)]
    entry.checked = !entry.checked

    entry.appendChange(mod.time, mod.user, entry.checked ? 'CHECK' : 'UNCHECK')
  }
}

class RenameCommandHandler extends ListCommandHandler {
  constructor () {
    super('RENAME')
  }

  handle (mod, list) {
    super.handle(mod, list)

    const argsIndex = mod.data.indexOf('|')

    const entry = list.entries[Number.parseInt(mod.data.substring(0, argsIndex), 10)]
    entry.title = mod.data.substring(argsIndex + 1)

    entry.appendChange(mod.time, mod.user, 'EDIT')
  }
}

class RelocateCommandHandler extends ListCommandHandler {
  constructor () {
    super('RELOCATE')
  }

  handle (mod, list) {
    super.handle(mod, list)

    const match = /(\d+)-(\d+)/.exec(mod.data)
    if (!match) return

    const from = Number.parseInt(match[1], 10)
    const to = Number.parseInt(match[2], 10)

    if (from === to) return

    list._entries.splice(to, 0, list._entries.splice(from, 1)[0])
    list.entries[to].appendChange(mod.time, mod.user, 'RELOCATE')
  }
}

class RenameListCommandHandler extends ListCommandHandler {
  constructor () {
    super('LISTRENAME')
  }

  handle (mod, list) {
    super.handle(mod, list)

    list.title = mod.data
  }
}

class ChangeDescCommandHandler extends ListCommandHandler {
  constructor () {
    super('CHANGEDESC')
  }

  handle (mod, list) {
    super.handle(mod, list)

    const argsIndex = mod.data.indexOf('|')

    const entry = list.entries[Number.parseInt(mod.data.substring(0, argsIndex), 10)]
    entry.description = mod.data.substring(argsIndex + 1) || undefined
  }
}

exports.handlers = {
  LISTRENAME: new RenameListCommandHandler(),

  CREATE: new CreateCommandHandler(),
  DELETE: new DeleteCommandHandler(),
  CHECK: new CheckCommandHandler(),
  RENAME: new RenameCommandHandler(),
  RELOCATE: new RelocateCommandHandler(),
  CHANGEDESC: new ChangeDescCommandHandler()
}
