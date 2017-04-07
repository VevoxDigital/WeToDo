'use strict'

class ListCommandHandler {
  constructor (command) {
    if (typeof command !== 'string') throw new Error('Command must be a string')

    Object.defineProperty(this, 'command', { value: command, enumerable: true })
  }

  handle (entry) {
    console.log(`${this.command}: ${entry.uuid}`)
  }

  handleUI (entry, element) {
    console.log(`UI ${this.command}: ${entry.uuid}`)
  }
}

class CreateCommandHandler extends ListCommandHandler {
  constructor () {
    super('CREATE')
  }

  handle (entry) {
    super.handle(entry)
    // TODO Actually handle this command
  }

  handleUI (entry, element) {
    super.handleUI(entry, element)
  }
}

exports.handlers = {
  CREATE: new CreateCommandHandler()
}
