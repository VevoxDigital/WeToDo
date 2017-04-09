'use strict'

const { handlers } = require('./list-handlers')

const genUuid = require('uuid/v4')
const assert = require('assert')

/**
  * @class ListModificationEntry
  * An entry in a list's history that represents a change to the list itself
  */
exports.ListModification = class ListModification {
  /**
    * @constructor ListModification(string)
    * Creates a new list entry for the given list from the given data.
    *
    * @param data The data to parse the modification from
    */
  constructor (data) {
    if (typeof data !== 'string') throw new Error('expected string data, got ' + typeof data)

    let obj = exports.ListModification.pattern.exec(data)
    if (!obj) throw new Error('bad entry line: ' + obj)

    Object.defineProperty(this, 'time', { value: new Date(Number.parseInt(obj[1], 10)), enumerable: true })
    Object.defineProperty(this, 'user', { value: obj[3], enumerable: true })
    Object.defineProperty(this, 'data', { value: obj[4], enumerable: true })

    const handler = handlers[obj[2]]
    if (!handler) throw new Error('unknown command: ' + obj[2])

    Object.defineProperty(this, 'handler', { value: handler, enumerable: true })
  }

  /**
    * @method #resolveUser()
    * Resolves the user associated with this entry. This will return a Promise to
    * either load the user from the cache, or look up the user's information.
    *
    * @return Promise<object>
    */
  resolveUser () {
    // TODO Fetch user information from user ID
    // possibly a separate user resolver?
    return new Promise(resolve => { resolve(this.user) })
  }

  /**
    * @method #handle(object)
    * Applies this modification to the given target
    *
    * @param target The target to apply to
    */
  apply (target) {
    return this.handler.handle(this.data, target)
  }

  /**
    * @method #toString()
    * Serializes this entry back into a string.
    *
    * @return string
    */
  toString () {
    return `${this.time.getTime()} ${this.handler.command} ${this.user} ${this.data}`
  }
}

// entry pattern is in format
// timestamp COMMAND provider:uid data
// ex: 123456789 CREATE google:123456 CHECK|Example Checklist Item
exports.ListModification.pattern = /^([0-9]+) ([A-Z_]+) ([a-z]+:\d+) (.+)$/

// -----------------------------------------------------------------------------------------------------

/**
  * @class ListEntry
  * An entry in a list, modifiable by ListModifications
  */
exports.ListEntry = class ListEntry {
  /**
    * @constructor ListEntry(type, title)
    * Creates a new entry with the given type and title
    *
    * @param type The type of entry
    * @param title The title of this entry
    */
  constructor (type, title) {
    if (typeof type !== 'string') throw new Error('expected string type, got ' + typeof type)
    if (typeof title !== 'string') throw new Error('expected string title, got ' + typeof title)

    Object.defineProperty(this, 'type', { value: type, enumerable: true })

    this.title = title
    this.users = [ ]
  }
}

// -----------------------------------------------------------------------------------------------------

/**
  * @class List
  * A list object containing the data to define a list
  */
exports.List = class List {
  /**
    * @constructor List(string|undefined, string, object|Array|undefined)
    * Creates a new list from the given uuid, title, and users. If the uuid is
    * undefined, a new one will be generated.
    *
    * @param uuid The UUID
    * @param title The list title
    * @param users The users to be added to the list
    */
  /* eslint complexity: [ 'error', 7 ] */
  constructor (uuid, title, users) {
    assert(!uuid || typeof uuid === 'string', 'expected string UUID, got ' + typeof uuid)
    users = users instanceof Array ? /* istanbul ignore next */ users : (typeof users === 'string' ? [ users ] : [ ])

    // define constants and non-enumerables
    Object.defineProperty(this, 'uuid', { value: uuid || genUuid(), enumerable: true })
    Object.defineProperty(this, '_users', { value: users, writeable: true })

    Object.defineProperty(this, '_mods', { value: [ ], writeable: true })
    Object.defineProperty(this, '_entries', { value: [ ], writeable: true })

    this.title = title
  }
  get modifications () {
    return this._mods.slice()
  }
  get entries () {
    return this._entries.slice()
  }
  get users () {
    return this._users.slice()
  }

  /**
    * @method #addModification(ListModification)
    * Adds a modification to this list and re-sorts the modification array
    * to be ordered by timestamp. This is not apply the modifications.
    *
    * @param mod The modification to add.
    */
  addModification (mod) {
    assert(mod instanceof exports.ListModification, 'expected ListModification')
    this._mods.push(mod)

    this._mods.sort((a, b) => {
      return a.time.getTime() - b.time.getTime()
    })
  }

  /**
    * @method #addEntry(ListEntry)
    * Adds a list entry to this list
    *
    * @param entry A list entry
    */
  addEntry (entry) {
    assert(entry instanceof exports.ListEntry, 'expected ListEntry')
    this._entries.push(entry)
  }

  /**
    * @method #apply(number)
    * Applies the modification at the given index to this list
    *
    * @param index The modification to apply
    */
  apply (index) {
    assert(typeof index === 'number', 'expected numerical index, got ' + typeof index)

    const mod = this.modifications[index]
    assert(mod, 'unknown modification index')

    mod.apply(typeof mod.handler.target === 'number' ? /* istanbul ignore next */ this._entries[mod.handler.target] : this)
  }

  /**
    * @method #applyFrom(number=0)
    * Applies modifications, starting a the given line index, to this list.
    *
    * @param data The data to apply with
    * @param index The index to start from
    */
  applyFrom (index = 0) {
    for (let i = index; i < this.modifications.length; i++) {
      try {
        this.apply(i)
      } catch (e) {
        /* istanbul ignore next */ console.warn(`failed to apply line ${i + 1} to list ${this.uuid}:`)
        /* istanbul ignore next */ console.warn(e)
      }
    }
  }

  /**
    * @method #reset()
    * Resets all of this list's entries and re-applies all modifications.
    */
  reset () {
    this._entries.length = 0

    this.applyFrom()
  }

  /**
    * @method #resolveUsers()
    * Returns a promise that resolves with a list of all resolved users
    *
    * @return Promise<Array<User>>
    */
  resolveUsers () {
    // TODO User resolution
    return new Promise(resolve => { return resolve(this.users) })
  }

  /**
    * @method #isShared()
    * Determines if this list is shared (i.e. is has multiple users).
    *
    * @return boolean
    */
  isShared () {
    return this.users.length > 1
  }

  /**
    * @method #toString()
    * Serializes this list into a string.
    *
    * @return string
    */
  toString () {
    let str = `${this.title}\n${this.users.join(' ')}`
    for (const entry of this.modifications) str += `\n${entry.toString()}`

    return str
  }
}

/**
  * @function parseList(string, string)
  * Creates a new list from the given data and uuid.
  *
  * @param uuid The UUID.
  * @param data The data
  * @return List
  */
exports.List.parseList = (uuid, data) => {
  data = data.split(/\n/g)

  const list = new exports.List(uuid, data.shift(), data.shift().split(/ /g))
  data.forEach(line => {
    try {
      list.addModification(new exports.ListModification(line))
    } catch (e) {
      /* istanbul ignore next */ console.warn(`failed to add modification '${line}'`)
      /* istanbul ignore next */ console.warn(e)
    }
  })
  list.reset()

  return list
}
