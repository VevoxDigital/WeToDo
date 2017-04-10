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
    * @constructor
    * Creates a new list entry for the given list from the given data.
    *
    * @param {string} data The data to parse the modification from
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
    * @method
    * Resolves the user associated with this entry. This will return a Promise to
    * either load the user from the cache, or look up the user's information.
    *
    * @return {Promise<object>}
    */
  resolveUser () {
    // TODO Fetch user information from user ID
    // possibly a separate user resolver?
    return new Promise(resolve => { resolve(this.user) })
  }

  /**
    * @method
    * Applies this modification to the given target
    *
    * @param {object} target The target to apply to
    */
  apply (target) {
    return this.handler.handle(this, target)
  }

  /**
    * @method
    * Serializes this entry back into a string.
    *
    * @return {string}
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
  * @class
  * An entry in a list, modifiable by ListModifications
  */
exports.ListEntry = class ListEntry {
  /**
    * @constructor
    * Creates a new entry with the given type and title
    *
    * @param {string} type The type of entry
    * @param {string} title The title of this entry
    */
  constructor (type, title) {
    assert.strictEqual(typeof type, 'string')
    assert.strictEqual(typeof title, 'string')

    Object.defineProperty(this, 'type', { value: type, enumerable: true })

    this.title = title

    Object.defineProperty(this, '_changes', { value: [ ] })
  }

  get changes () {
    return this._changes.slice()
  }

  /**
    * @method
    * Appends a change with the given data to this entry
    *
    * @param {Date} time The time of the change
    * @param {string} user The user that issued the change
    * @param {string} type The type of change
    */
  appendChange (time, user, type) {
    assert(time instanceof Date, 'time must be a Date')
    assert.strictEqual(typeof user, 'string')
    assert.strictEqual(typeof type, 'string')

    this._changes.push({ time: time, user: user, type: type })
  }

  /**
    * @method
    * Appends a ListModification as a change to this entry
    *
    * @param {ListModification} mod The modification
    */
  appendModification (mod) {
    assert(mod instanceof exports.ListModification, 'modification must be a ListModification')

    this.appendChange(mod.time, mod.user, mod.handler.command)
  }
}

// -----------------------------------------------------------------------------------------------------

/**
  * @class
  * A list object containing the data to define a list
  */
exports.List = class List {
  /**
    * @constructor
    * Creates a new list from the given uuid, title, and users. If the uuid is
    * undefined, a new one will be generated.
    *
    * @param {string} [uuid] The UUID
    * @param {string} title The list title
    * @param {object} [users] The users to be added to the list
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
    * @method
    * Adds a modification to this list and re-sorts the modification array
    * to be ordered by timestamp. This is not apply the modifications.
    *
    * @param {ListModification} mod The modification to add.
    */
  addModification (mod) {
    assert(mod instanceof exports.ListModification, 'expected ListModification')
    this._mods.push(mod)

    this._mods.sort((a, b) => {
      return a.time.getTime() - b.time.getTime()
    })
  }

  /**
    * @method
    * Adds a list entry to this list
    *
    * @param {ListEntry} entry A list entry
    */
  addEntry (entry) {
    assert(entry instanceof exports.ListEntry, 'expected ListEntry')
    this._entries.push(entry)
  }

  /**
    * @method
    * Applies the modification at the given index to this list
    *
    * @param {number} index The modification to apply
    */
  apply (index) {
    assert(typeof index === 'number', 'expected numerical index, got ' + typeof index)

    const mod = this.modifications[index]
    assert(mod, 'unknown modification index')

    mod.apply(typeof mod.handler.target === 'number' ? /* istanbul ignore next */ this._entries[mod.handler.target] : this)
  }

  /**
    * @method
    * Applies modifications, starting a the given line index, to this list.
    *
    * @param {number} index=0 The index to start from
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
    * @method
    * Resets all of this list's entries and re-applies all modifications.
    */
  reset () {
    this._entries.length = 0

    this.applyFrom()
  }

  /**
    * @method
    * Returns a promise that resolves with a list of all resolved users
    *
    * @return {Promise<Array<User>>}
    */
  resolveUsers () {
    // TODO User resolution
    return new Promise(resolve => { return resolve(this.users) })
  }

  /**
    * @method
    * Determines if this list is shared (i.e. is has multiple users).
    *
    * @return {boolean}
    */
  isShared () {
    return this.users.length > 1
  }

  /**
    * @method
    * Serializes this list into a string.
    *
    * @return {string}
    */
  toString () {
    let str = `${this.title}\n${this.users.join(' ')}`
    for (const entry of this.modifications) str += `\n${entry.toString()}`

    return str
  }
}

/**
  * @function
  * Creates a new list from the given data and uuid.
  *
  * @param {string} uuid The UUID.
  * @param {string} data The data
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
