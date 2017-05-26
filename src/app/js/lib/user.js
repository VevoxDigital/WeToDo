'use strict'

const assert = require('assert')

const LOCALS = [
  'WeToDo',
  'you'
]

const resolvers = new Map()

exports.ProviderResolver = class ProviderResolver {
  constructor (provider) {
    assert.strictEqual(typeof provider, 'string')

    Object.defineProperty(this, 'provider', { value: provider, enumerable: true })
  }

  resolve (uid) {
    // no-op
  }
}
exports.ProviderResolver.registerResolver = resolver => {
  assert.strictEqual(typeof resolver, 'object')
  assert.ok(resolver instanceof exports.ProviderResolver, 'Invalid resolver type of ' + resolver.toString())

  resolvers.set(resolver.provider, resolver)
}

exports.LocalProviderResolver = class LocalProviderResolver extends exports.ProviderResolver {
  constructor () {
    super('local')
  }

  resolve (uid) {
    const i = Number.parseInt(uid, 10)
    assert.ok(i < LOCALS.length, 'Unknown local user: ' + uid)

    return new Promise(resolve => { resolve({ name: LOCALS[i] }) })
  }
}
exports.ProviderResolver.registerResolver(new exports.LocalProviderResolver())

// this will act as our "cache"
const cache = new Map()

exports.User = class User {
  constructor (id) {
    assert.strictEqual(typeof id, 'string')

    Object.defineProperty(this, 'id', { value: id, enumerable: true })
  }

  get provider () {
    return this.id.substring(0, this.id.indexOf(':'))
  }

  get uid () {
    return this.id.substring(this.id.indexOf(':') + 1)
  }

  resolve () {
    if (!cache.has(this.provider)) cache.set(this.provider, new Map())
    const ids = cache.get(this.provider)

    if (ids.has(this.uid)) return new Promise(ids.get(this.uid))

    const provider = resolvers.get(this.provider)
    assert.ok(provider, 'Unknown provider: ' + this.provider)

    return provider.resolve(this.uid).then(data => {
      Object.defineProperty(this, 'data', { value: data })
      ids.set(this.uid, this)
      return this
    })
  }
}
