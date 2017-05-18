'use strict'

const { List } = require('./lib/list')
const { User } = require('./lib/user')

const ui = require('./ui')
const data = require('./lib/data')

const _ago = require('node-time-ago')

const KEY_USER = 'user'

const ago = time => {
  const a = _ago(time)

  // the times are inaccurate by ~20 seconds, so we're just going to ignore
  // anything less than a minute
  return a.match(/seconds? ago$/i) ? 'just now' : a
}

class App {
  constructor () {
    this.on('init', () => { this.onInit() })
    this.on('deviceready', () => { this.onDeviceReady() })
    this.on('fsready', () => { this.onFSReady() })
    this.on('ready', () => { this.onReady() })

    Object.defineProperty(this, 'storage', { value: window.localStorage })
    Object.defineProperty(this, 'lists', { value: new Map() })
    // TODO Define some property on a list that determines if its "favorited" or not
  }

  /**
    * @method
    * Binds the given event to the given handler
    *
    * @param {string} eventName The name of the event
    * @param {function} handler The handler function
    */
  on (eventName, handler) {
    $(document).bind(eventName, handler)
  }

  /**
    * @method
    * Emits an event by the given name, optionally with the given data
    *
    * @param {string} eventName The name of the event
    * @param {*} [data] The data to send
    */
  emit (eventName, data) {
    $(document).trigger(eventName, data)
  }

  ago (date) {
    // TODO Move the target method here
    return ago(date)
  }

  // Fired on 'init' event
  onInit () {
    console.log('app: init')
  }

  onDeviceReady () {
    console.log('app: deviceready')

    const defineUser = uid => {
      Object.defineProperty(this, 'user', { value: new User(uid) })
      this.user.resolve().then(() => {
        this.emit('fsready')
      })
    }

    const uid = this.storage.getItem(KEY_USER)
    if (uid) {
      console.log('Found user: ' + uid)
      defineUser(uid)
    } else {
      console.log('Could not find local user, attempting login')

      // TODO Actually log the user in
      // DEBUG Create the current user as a local user
      defineUser('local:1')
    }
  }

  onFSReady () {
    console.log('app: fsready')

    data.getFileSystem().then(() => {
      console.log('file system granted, looking for lists')
    }).then(data.getListEntries).then(entries => {
      console.log(`* found ${entries.length} entry(s), attempting to load...`)

      const getList = (entry) => {
        return data.readList(entry).then(data => {
          return Promise.resolve(List.parseList(entry.name, data))
        })
      }

      const promises = [ ]
      entries.forEach(entry => { promises.push(getList(entry)) })
      return Promise.all(promises)
    }).then(lists => {
      lists.forEach(list => { if (list) this.lists.set(list.uuid, list) })
      this.emit('ready')
    }).catch(console.error)
  }

  // The user is fully loaded (and resolved)
  // we can now hide the cover and proceed with loading the app
  onReady () {
    console.log('app: ready')

    // constants
    Object.defineProperty(this, 'templateNode', { value: $('#listTemplateNode') })
    Object.defineProperty(this, 'headerHeight', { value: $('#header').height() })

    // set the updater for time ago on list timestamps
    setInterval(() => {
      $('#listNode .list-change-time').each(function () {
        const times = $(this)
        const time = Number.parseInt(times.attr('data-timestamp'), 10)

        times.text(ago(time))
      })
      ui.renderer.renderLists(this) // re-render lists every time the time should update
    }, 1000 * 20) // every 20 seconds...?

    // bind events
    $('a[target="_system"]').click(e => {
      e.preventDefault()
      window.open($(e.currentTarget).attr('href'), '_system')
    })
    this.bindUIEvents()

    // initial list render
    ui.renderer.renderLists(this)

    // move the cover out of the way
    ui.animator.shiftToMenu(this)
    $('#loadingCover').velocity({
      opacity: 0
    }, {
      duration: 500,
      complete: () => {
        $('#loadingCover').remove()
      }
    })
  }

  bindUIEvents () {
    // show about dialog on click
    $('#header .fa-info').click(() => {
      ui.dialogs.show('About')
    })

    // return home in list view
    $('#header .fa-bars').click(() => {
      if (this.activeList) {
        this.activeList = undefined

        ui.renderer.renderEntries(this)
        ui.animator.shiftToMenu(this)
      }
    })

    ui.dialogs.bindDialogEvents(this)
  }

  /**
    * @method
    * Gets the currently active list item, or -1 if no item is active
    *
    * @return {number} The currently active item
    */
  getActiveListItem () {
    return Number.parseInt($('#listNode').attr('data-active-item') || '-1', 10)
  }

  /**
    * @method
    * Sets the active list item, or clears the active item if not specified.
    *
    * @param {number} [item] The item index to set active
    */
  setActiveListItem (item) {
    const nodes = $('#listNode').find('li > .list-body')
    nodes.find('p').hide()
    nodes.find('.list-options').hide()
    nodes.find('ul > li:not(:nth-child(1))').hide()

    // if 'item' is a number, make that item active
    if (typeof item === 'number' && item >= 0) {
      const node = $('#listNode').find(`li[data-id=${item}]`)
      node.find('p').show()
      node.find('.list-options').show()
      node.find('ul > li').show()

      $('#listNode').attr('data-active-item', item)
    } else {
      $('#listNode').removeAttr('data-active-item')
    }
  }
}

const app = new App()
app.emit('init')
