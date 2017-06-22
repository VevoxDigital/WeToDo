'use strict'

const lists = require('./list')
const assert = require('assert')

const TARGETED_SYMBOL = '|'

function parseTargetedData (data) {
  const i = data.indexOf(TARGETED_SYMBOL)
  return [ data.substring(0, i), data.substring(i + 1) ]
}

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

    const data = parseTargetedData(mod.data)
    const entry = new lists.ListEntry(list, data[0], data[1])
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

    let id = Number.parseInt(mod.data, 10)

    // remove the entry
    list._entries.splice(list.getEntryIndexFromID(id), 1)

    // clean up modifications about this item
    for (let i = 0; i < list._mods.length; i++) {
      const mod = list._mods[i]
      if (mod.data.startsWith(id + TARGETED_SYMBOL) || (mod.data === '' + i && mod.handler.command !== exports.handlers.DELETE.command)) {
        list._mods.splice(i--, 1)
      }
    }
  }
}

class CheckCommandHandler extends ListCommandHandler {
  constructor () {
    super('CHECK')
  }

  handle (mod, list) {
    super.handle(mod, list)

    const entry = list.getEntryByID(Number.parseInt(mod.data, 10))
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

    const entry = list.getEntryByID(Number.parseInt(mod.data.substring(0, argsIndex), 10))
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

    const match = /(\d+)\|(\d+)/.exec(mod.data)
    if (!match) return

    const target = Number.parseInt(match[1], 10)
    let to = Number.parseInt(match[2], 10)

    const from = list.getEntryIndexFromID(target)

    /* istanbul ignore if */
    if (from === to) return
    if (to > from) to--

    const entry = list._entries.splice(from, 1)[0]

    if (list.entries[to]) list._entries.splice(to, 0, entry)
    else list._entries.push(entry)

    entry.appendChange(mod.time, mod.user, 'RELOCATE')
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

    const entry = list.getEntryByID(Number.parseInt(mod.data.substring(0, argsIndex), 10))
    entry.description = mod.data.substring(argsIndex + 1) || /* istanbul ignore next */ undefined

    entry.appendChange(mod.time, mod.user, 'EDIT')
  }
}

class ClearCommandHandler extends ListCommandHandler {
  constructor () {
    super('CLEAR')
  }

  handle (mod, list) {
    super.handle(mod, list)

    if (list._mods.length > 1) {
      list._mods.length = 0
      list.reset()
      list._mods.push(mod)
    }
  }
}

exports.handlers = {
  LISTRENAME: new RenameListCommandHandler(),

  CREATE: new CreateCommandHandler(),
  DELETE: new DeleteCommandHandler(),
  CHECK: new CheckCommandHandler(),
  RENAME: new RenameCommandHandler(),
  RELOCATE: new RelocateCommandHandler(),
  CHANGEDESC: new ChangeDescCommandHandler(),
  CLEAR: new ClearCommandHandler()
}
