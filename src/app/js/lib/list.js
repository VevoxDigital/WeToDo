'use strict'

const { handlers } = require('./list-handlers')

const genUuid = require('uuid/v4')

/**
  * @class ListModificationEntry
  * An entry in a list's history that represents a change to the list itself
  */
exports.ListModificationEntry = class ListModificationEntry {
  /**
    * @constructor ListModificationEntry(List, string|object)
    * Creates a new list entry for the given list from the given data. If the
    * data is a string, the data will be parsed into an object and recursively invoked.
    */
  constructor (list, data) {
    if (!(list instanceof exports.List)) throw new Error('Given list must be a List object')
    if (typeof data === 'string') {
      // parse key string into object
      let obj = exports.ListModificationEntry.pattern.exec(data)
      if (!obj) throw new Error('Bad entry line: ' + obj)
      return new exports.ListModificationEntry(list, {
        time: new Date(Number.parseInt(obj[1], 10)),
        command: obj[2],
        user: obj[3],
        data: obj[4]
      })
    } else if (typeof data === 'object') {
      // we have a data object, make a class of it
      Object.defineProperty(this, 'list', { value: list })
      Object.defineProperty(this, 'time', { value: data.time, enumerable: true })
      Object.defineProperty(this, 'command', { value: data.command, enumerable: true })
      Object.defineProperty(this, 'user', { value: data.user, enumerable: true })
      Object.defineProperty(this, 'data', { value: data.data, enumerable: true })

      const handler = handlers[data.command]
      if (!handler) throw new Error('Unknown command')
      Object.defineProperty(this, 'handler', { value: handler })
    } else throw new Error('data must be entry line or object')
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
    * @method #toString()
    * Serializes this entry back into a string.
    *
    * @return string
    */
  toString () {
    return `${this.time.getTime()} ${this.command} ${this.user} ${this.data}`
  }
}

// entry pattern is in format
// timestamp COMMAND provider:uid data
// ex: 123456789 CREATE google:123456 CHECK|Example Checklist Item
exports.ListModificationEntry.pattern = /^([0-9]+) ([A-Z_]+) ([a-z]+:\d+) (.+)$/

// -----------------------------------------------------------------------------------------------------

/**
  * @class List
  * A list object containing the data to define a list
  */
exports.List = class List {
  /**
    * @constructor List(string|object)
    * Creates a new list from the given data. If the date is a string, its is
    * parsed into an object and this constructor is recursively invoked.
    */
  /* eslint complexity: [ 'error', 7 ] */
  constructor (data, uuid) {
    if (typeof data === 'string') {
      data = data.split(/\n/g)
      const list = new exports.List({ name: data.shift(), users: data.shift().split(/ /g) }, uuid)
      for (const line of data) {
        try {
          list.addEntry(new exports.ListModificationEntry(this, line))
        } catch (e) {
          // console.warn(e)
        }
      }
      return list
    } else {
      Object.defineProperty(this, 'name', { value: data.name, enumerable: true })
      Object.defineProperty(this, 'uuid', { value: uuid || genUuid(), enumerable: true })

      Object.defineProperty(this, '_entries', { value: [ ], writeable: true })

      Object.defineProperty(this, '_users', { value: data.users || (data.user ? [ data.user ] : [ ]), writeable: true })
    }
  }
  get entries () {
    return this._entries.slice()
  }
  get users () {
    return this._users.slice()
  }

  /**
    * @method #addEntry(ListModificationEntry)
    * Adds a list entry to this list
    *
    * @param entry A list entry
    */
  addEntry (entry) {
    if (!(entry instanceof exports.ListModificationEntry)) throw new Error('Entry must be a list')
    this._entries.push(entry)
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
    let str = `${this.name}\n${this.users.join(' ')}`
    for (const entry of this.entries) str += `\n${entry.toString()}`

    return str
  }
}
