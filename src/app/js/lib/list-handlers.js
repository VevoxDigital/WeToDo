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

class RenameListCommandHandler extends ListCommandHandler {
  constructor () {
    super('LISTRENAME')
  }

  handle (mod, list) {
    super.handle(mod, list)

    list.title = mod.data
  }
}

exports.handlers = {
  LISTRENAME: new RenameListCommandHandler(),

  CREATE: new CreateCommandHandler(),
  DELETE: new DeleteCommandHandler(),
  CHECK: new CheckCommandHandler()
}
