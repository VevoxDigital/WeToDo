'use strict'

const lists = require('./list')
const assert = require('assert')

class ListCommandHandler {
  constructor (command) {
    assert.strictEqual(typeof command, 'string')

    Object.defineProperty(this, 'command', { value: command, enumerable: true })
  }

  handle (mod) {
    /* istanbul ignore next */
    if (typeof window !== 'undefined') console.log(`${this.command}: ${this.target || 'LIST'} ${mod.data}`)
  }

  // an 'undefined' target will target the whole list
  get target () {
    return undefined
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

exports.handlers = {
  CREATE: new CreateCommandHandler(),
  DELETE: new DeleteCommandHandler()
}
