'use strict'

class App {
  constructor () {
    this.on('init', () => {
      console.log('init')
    })
    this.on('deviceready', () => {
      console.log('ready')
    })
  }

  on (eventName, handler) {
    $(document).bind(eventName, handler)
  }

  emit (eventName, data) {
    $(document).trigger(eventName, data)
  }
}

const app = new App()
app.emit('init')
