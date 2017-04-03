'use strict'

class ListCommandHandler {
  constructor (command) {
    if (typeof command !== 'string') throw new Error('Command must be a string')

    Object.defineProperty(this, 'command', { value: command, enumerable: true })
  }

  handle (entry) {
    // no-op
  }
}

class CreateCommandHandler extends ListCommandHandler {
  constructor () {
    super('CREATE')
  }

  handle (entry) {
    // TODO Actually handle this command
  }
}

exports.handlers = {
  CREATE: new CreateCommandHandler()
}
