'use strict'

const { List, ListModification } = require('./lib/list')
const { User } = require('./lib/user')
const { handlers } = require('./lib/list-handlers')

const ui = require('./ui')
const data = require('./lib/data')

const _ago = require('node-time-ago')

const KEY_USER = 'user'
const KEY_NEW = 'isNew'

class App {
  constructor () {
    this.on('init', () => { this.onInit() })
    this.on('deviceready', () => { this.onDeviceReady() })
    this.on('fsready', () => { this.onFSReady() })
    this.on('ready', () => { this.onReady() })

    Object.defineProperty(this, 'storage', { value: window.localStorage })
    Object.defineProperty(this, 'lists', { value: new Map() })
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
    const a = _ago(date)

    // the times are inaccurate by ~20 seconds, so we're just going to ignore
    // anything less than a minute
    return a.match(/seconds? ago$/i) ? 'just now' : a
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
    }).catch(err => { console.error(err) })
  }

  // The user is fully loaded (and resolved)
  // we can now hide the cover and proceed with loading the app
  onReady () {
    console.log('app: ready')

    // constants
    Object.defineProperty(this, 'templateNode', { value: $('#listTemplateNode') })
    Object.defineProperty(this, 'listNode', { value: $('#listNode') })
    Object.defineProperty(this, 'headerHeight', { value: $('#header').height() })

    // set the updater for time ago on list timestamps
    setInterval(() => {
      const app = this
      $('#listNode .list-change-time').each(function () {
        const times = $(this)
        const time = Number.parseInt(times.attr('data-timestamp'), 10)

        times.text(app.ago(time))
      })
      ui.renderer.renderLists(this) // re-render lists every time the time should update
    }, 1000 * 20) // every 20 seconds...?

    // bind events
    $('a[target="_system"]').click(e => {
      e.preventDefault()
      window.open($(e.currentTarget).attr('href'), '_system', '')
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

    if (!this.storage.getItem(KEY_NEW)) {
      ui.dialogs.alert(
        'WeToDo is still in early development stages, and some functionality may be missing or mis-behaved. ' +
        'Please help us correct these issues by submitting reports to ' +
        '<a href="https://github.com/VevoxDigital/WeToDo/issues" target="_system">our GitHub</a>.<br><br>Thank you for using WeToDo, ' +
        'and thank you for helping us continue to develop it into something even better.'
      )
      this.storage.setItem(KEY_NEW, true)
    }
  }

  bindUIEvents () {
    // bind navigation dialogs
    $('#header .fa-info').click(() => { ui.dialogs.show('About') })
    // TODO Actual user and settings dialog
    $('#header .fa-user').click(() => { ui.dialogs.alert('Collaborative list editing will be available soon.') })
    $('#header .fa-cog').click(() => { ui.dialogs.alert('Settings and push notifications will be available soon.') })

    // return home in list view
    $('#header .nav-icon-brand > a').click(() => {
      if (this.activeList) {
        this.activeList = undefined

        ui.renderer.renderEntries(this)
        ui.animator.shiftToMenu(this)
      }
    })

    ui.dialogs.bindDialogEvents(this)
    this.bindListDrag()
    this.bindUserResolution()

    $(document).on('backbutton', e => {
      if (this.activeList) {
        e.preventDefault()
        this.activeList = undefined
        ui.animator.shiftToMenu(this)
      } else {
        navigator.app.exitApp()
      }
    })

    /* $('#listNode').sortable({
      start: (e, element) => {
        element.item.data('from', element.item.index())
      },
      stop: (e, element) => {
        if (!this.activeList) return

        const from = element.item.data('from')
        const to = element.item.index()

        if (from === to) return

        this.activeList.modifyAndSave(
          ListModification.create(handlers.RELOCATE.command, this.user, `${from}-${to}`))
        ui.renderer.renderEntries(this)
      }
    }) */
  }

  bindListDrag () {
    const guide = this.templateNode.find('.list-reorder-guide')
    const movementClass = 'list-item-moving'

    let heldItem
    this.listNode.on('press', '.list-item', e => {
      heldItem = $(e.target).closest('.list-item')
      heldItem.fromIndex = heldItem.index()
      heldItem.addClass(movementClass)
    })
    $(document).on('touchmove mousemove', e => {
      if (!heldItem) return
      if (!$(e.target).is('#list') && !$.contains($('#list')[0], e.target)) {
        heldItem.removeClass(movementClass)
        heldItem = undefined
        return
      }
      e.preventDefault()

      guide.detach()

      const targ = $(document.elementFromPoint($(document).width() / 2, e.pageY)).closest('.list-item')
      if (targ[0]) { // i.e. we actually found '.list-item'
        heldItem.toIndex = targ.index()

        // try to place the guide
        if (heldItem.toIndex >= this.activeList.entries.length) {
          guide.appendTo(this.listNode)
        } else guide.appendTo(this.listNode.children().eq(heldItem.toIndex))
      } else if ($(e.target).is('#listOptions')) {
        heldItem.toIndex = 0
        guide.appendTo(this.listNode.children().eq(1))
      } else {
        heldItem.toIndex = this.activeList.entries.length
        guide.appendTo(this.listNode)
      }
    }).on('touchend mouseup', e => {
      if (!heldItem) return
      e.preventDefault()

      if (typeof heldItem.toIndex === 'number' && heldItem.fromIndex !== heldItem.toIndex) {
        this.activeList.modifyAndSave(
          ListModification.create(handlers.RELOCATE.command, this.user, `${heldItem.fromIndex}-${heldItem.toIndex}`))
        ui.renderer.renderEntries(this)
      }

      heldItem.removeClass(movementClass)
      heldItem = undefined
      guide.detach()
    })
  }

  bindUserResolution () {
    setInterval(() => {
      $('[data-user]:not([data-user-resolve])').each((index, element) => {
        const e = $(element)
        e.attr('data-user-resolve', 0)

        const user = new User(e.attr('data-user'))
        user.resolve().then(() => {
          e.attr('data-user-resolve', 1).text(this.getUserResolutionText(user, e.attr('data-user-property') || 'name'))
        }).catch(err => {
          e.attr('data-user-resolve', -1)
          console.warn(err)
        })
      })
    }, 100)
  }

  getUserResolutionText (user, prop) {
    switch (prop) {
      case 'name': return user.data.name
      case 'premium': return user.data.premium ? 'Premium' : 'Standard'
    }
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
