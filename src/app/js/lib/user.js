'use strict'

const assert = require('assert')

const LOCALS = [
  'WeToDo',
  'John Doe',
  'Jane Doe'
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
    // TODO Read from cache
    const provider = resolvers.get(this.provider)
    assert.ok(provider, 'Unknown provider: ' + this.provider)

    return provider.resolve(this.uid).then(data => {
      Object.defineProperty(this, 'data', { value: data })
    })
  }
}
