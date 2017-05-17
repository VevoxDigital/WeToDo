'use strict'

const { List, ListModification } = require('./lib/list')
const { User } = require('./lib/user')
const { handlers } = require('./lib/list-handlers')

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
      ui.renderer.renderLists() // re-render lists every time the time should update
    }, 1000 * 20) // every 20 seconds...?

    // bind events
    $('a[target="_system"]').click(e => {
      e.preventDefault()
      window.open($(e.currentTarget).attr('href'), '_system')
    })
    this.bindUIEvents()

    // initial list render
    ui.renderer.renderLists()

    // move the cover out of the way
    ui.animator.shiftToHome(this)
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
    const self = this

    // dialog closing
    $('#dialogs .dialog-close').click(function () {
      self.hideDialog($(this).parent().attr('id').substring(6))
    })

    // confirmation dialog
    const dialogConfirm = $('#dialogConfirm')
    dialogConfirm.find('.dialog-close').click(() => {
      dialogConfirm.find('.btn-confirm').unbind('click')
    })
    dialogConfirm.find('.btn-cancel').click(dialogConfirm.find('.dialog-close').click)

    // new list dialog
    const newListPrompt = $('#dialogListPrompt')
    $('#menu > button').click(() => {
      this.showDialog('ListPrompt')
      newListPrompt.find('[type=text]').val('').focus()
    })
    newListPrompt.submit(() => {
      const input = newListPrompt.find('[type=text]').val()
      const list = new List(null, input || 'List', this.user.id)

      this.lists.set(list.uuid, list)
      ui.renderer.renderLists()

      list.save()

      newListPrompt.find('.dialog-close').click()
    })

    // list edit dialog
    const editListPrompt = $('#dialogListEditPrompt')
    $('#listOptions .fa-cog').click(() => {
      if (!this.activeList || this.activeList.users[0] !== this.user.id) return
      this.showDialog('ListEditPrompt')
      editListPrompt.find('[type=text]').val(this.activeList.title).focus()
    })
    editListPrompt.submit(() => {
      const input = editListPrompt.find('[type=text]')

      this.activeList.addModification(ListModification.fromData(new Date(), handlers.LISTRENAME.command, this.user.id, input.val() || 'List'))
      this.activeList.applyLast()
      this.activeList.save()
      ui.renderer.renderLists()

      editListPrompt.find('.dialog-close').click()
      ui.animator.shiftToList(this)
    })
    editListPrompt.find('.dialog-options > .fa-close').click(() => {
      editListPrompt.find('.dialog-close').click()
      this.promptForConfirmation('Really delete this list? This action cannot be undone!', () => {
        data.deleteList(this.activeList.uuid)
        this.lists.delete(this.activeList.uuid)
        this.activeList = undefined

        ui.renderer.renderLists()
        ui.animator.shiftToHome(this)
      })
    })

    // new list item dialog
    const newItemPrompt = $('#dialogListItemPrompt')
    $('#listOptions .fa-plus').click(() => {
      this.showDialog('ListItemPrompt')
      newItemPrompt.find('[type=text]').val('').focus()
    })
    const addListItem = (type, val) => {
      this.activeList.modifyAndSave(ListModification.create(handlers.CREATE.command, this.user, `${type}|${val || 'Item'}`))
      ui.renderer.renderLastEntry(this, this.activeList)

      this.setActiveListItem(this.getActiveListItem())
      newItemPrompt.find('.dialog-close').click()
    }
    const input = newItemPrompt.find('[type=text]')
    newItemPrompt.submit(() => {
      addListItem('check', input.val())
    })
    newItemPrompt.find('.dialog-options > a').click(function () {
      addListItem($(this).attr('data-type'), input.val())
    })

    // about dialog
    $('#header .fa-info').click(() => {
      this.showDialog('About')
    })

    // return home in list view
    $('#header .fa-bars').click(() => {
      if (this.activeList) {
        this.activeList = undefined
        this.renderEntries()

        ui.animator.shiftToHome(this)
      }
    })
  }

  showDialog (dialog) {
    const d = $('#dialog' + dialog)
    const { w, h } = { w: d.width(), h: d.height() }

    d.css('opacity', 0)
      .css('width', w - 100)
      .css('height', h - 100)
      .show().velocity({
        opacity: 1,
        width: w,
        height: h
      }, 500, [500, 30])
  }

  hideDialog (dialog) {
    const d = $('#dialog' + dialog)
    d.velocity({
      opacity: 0
    }, {
      duration: 250,
      complete: () => {
        d.hide()
        d.removeAttr('style')
      }
    })
  }

  promptForConfirmation (message, cb) {
    const dialog = $('#dialogConfirm')
    dialog.find('.target').text(message)
    dialog.find('.btn-confirm').click(() => {
      dialog.find('.dialog-close').click()
      cb()
    })
    this.showDialog('Confirm')
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
