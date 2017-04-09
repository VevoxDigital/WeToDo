'use strict'

const lists = require('./list')
const assert = require('assert')

class ListCommandHandler {
  constructor (command) {
    assert.strictEqual(typeof command, 'string')

    Object.defineProperty(this, 'command', { value: command, enumerable: true })
  }

  handle (data) {
    /* istanbul ignore next */ if (typeof window !== 'undefined') console.log(`${this.command}: ${this.target || 'LIST'} ${data}`)
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

  handle (data, list) {
    super.handle(data, list)

    const argsIndex = data.indexOf('|')
    list.addEntry(new lists.ListEntry(data.substring(0, argsIndex), data.substring(argsIndex + 1)))
  }
}

exports.handlers = {
  CREATE: new CreateCommandHandler()
}
