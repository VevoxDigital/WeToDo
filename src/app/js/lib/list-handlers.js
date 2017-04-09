'use strict'

const lists = require('./list')

class ListCommandHandler {
  constructor (command) {
    if (typeof command !== 'string') throw new Error('expected string command, got ' + typeof command)

    Object.defineProperty(this, 'command', { value: command, enumerable: true })
  }

  handle (data) {
    if (typeof window !== 'undefined') console.log(`${this.command}: ${this.target || 'LIST'} ${data}`)
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
