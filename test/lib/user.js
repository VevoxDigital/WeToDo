'use strict'

const expect = require('expect.js')

const { User } = require('../../src/app/js/lib/user')

describe('User', () => {
  // TODO Finish tests for user

  describe('#resolve()', () => {
    const user = new User('local:0')

    it('should resolve user', done => {
      user.resolve().then(() => {
        expect(user.data.name).to.be('WeToDo')
        done()
      }).catch(e => { throw e })
    })

    it('should fetch from cache if resolved once before', done => {
      user.resolve().then(() => {
        expect(user.data.name).to.be('WeToDo')
        done()
      }).catch(e => { throw e })
    })
  })
})
