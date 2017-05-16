'use strict'

const { List, ListModification } = require('./lib/list')
const { User } = require('./lib/user')
const { handlers } = require('./lib/list-handlers')

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
      this.renderLists() // re-render lists every time the time should update
    }, 1000 * 20) // every 20 seconds...?

    // bind events
    $('a[target="_system"]').click(e => {
      e.preventDefault()
      window.open($(e.currentTarget).attr('href'), '_system')
    })
    this.bindUIEvents()

    // initial list render
    this.renderLists()

    // move the cover out of the way
    this.playShiftAnimationToHome()
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
      const list = new List(null, input, this.user.id)

      this.lists.set(list.uuid, list)
      this.renderLists()

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

      this.activeList.addModification(ListModification.fromData(new Date(), handlers.LISTRENAME.command, this.user.id, input.val()))
      this.activeList.applyLast()
      this.activeList.save()
      this.renderLists()

      editListPrompt.find('.dialog-close').click()
      this.playShiftAnimation(this.activeList.title, $('#headerSubtitle').text(), true)
    })
    editListPrompt.find('.dialog-options > .fa-close').click(() => {
      editListPrompt.find('.dialog-close').click()
      this.promptForConfirmation('Really delete this list? This action cannot be undone!', () => {
        data.deleteList(this.activeList.uuid)
        this.activeList = undefined
        this.playShiftAnimationToHome()
      })
    })

    // new list item dialog
    const newItemPrompt = $('#dialogListItemPrompt')
    $('#listOptions .fa-plus').click(() => {
      this.showDialog('ListItemPrompt')
      newItemPrompt.find('[type=text]').val('').focus()
    })
    const addListItem = (type, val) => {
      this.activeList.addModification(
        ListModification.fromData(new Date(), handlers.CREATE.command, this.user.id, `${type}|${val || 'Item'}`))

      this.activeList.applyLast()
      this.renderEntry(this.activeList, this.activeList.entries.length - 1)
      this.setActiveListItem(this.getActiveListItem())

      this.activeList.save()

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
        this.playShiftAnimationToHome()
        this.renderEntries()
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

  playShiftAnimationToHome () {
    let name = this.user.data.name
    name = name.indexOf(' ') > 0 ? name.substring(0, name.indexOf(' ')) : name

    this.playShiftAnimation('Hi, ' + name, 'Unknown Account')
  }

  playShiftAnimation (title, desc, offset) {
    const duration = 400

    const h1 = $('#headerTitle')
    const h2 = $('#headerSubtitle')
    const height = `-${this.headerHeight}px`

    h1.css('top', 0).velocity({ top: height }, duration, [ 250, 20 ])
    h2.css('top', 0).velocity({ top: height }, duration + 50, [ 250, 20 ])

    $('.body-content').velocity({
      left: offset ? '-100vw' : 0
    }, {
      duration: duration,
      easing: [ 250, 20 ],
      complete: () => {
        h1.text(title).css('top', height).velocity({ top: 0 }, duration, [ 250, 20 ])
        h2.text(desc).css('top', height).velocity({ top: 0 }, duration + 50, [ 250, 20 ])
      }
    })
  }

  /**
    * @method
    * Gets the FA icon to be used with the specific type of change.
    *
    * @param {string} type The type
    * @return {string} The icon name, without the 'fa-'
    */
  getChangeIconForType (type) {
    switch (type) {
      case 'CREATE': return 'plus'
      case 'CHECK': return 'check'
      case 'UNCHECK': return 'minus'

      default: return 'question'
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

  /**
    * @method
    * Renders the entry at the given position in the given list. If a rendered element
    * already exists for that entry, it is removed and re-rendered.
    *
    * @param {List} list The list
    * @param {number} id The index of the entry
    */
  renderEntry (list, id) {
    const listNode = $('#listNode')

    const item = this.templateNode.find('.list-item').clone()
    const entry = list.entries[id]

    // add type class and id attr
    item.addClass('list-item-' + entry.type)
    item.attr('data-id', id)

    const icon = item.find('.list-icon > a')
    switch (entry.type) {
      case 'check':
        icon.addClass('fa-minus')
        break
      case 'rule':
        // TODO
        break
      default:
        icon.addClass('fa-ellipsis-v')
    }
    const checkIconUpdate = () => {
      if (entry.checked) icon.addClass('fa-check').removeClass('fa-minus')
      else icon.removeClass('fa-check').addClass('fa-minus')
    }
    checkIconUpdate()
    icon.click(() => {
      this.activeList.addModification(ListModification.fromData(new Date(), handlers.CHECK.command, this.user.id, item.attr('data-id')))
      this.activeList.applyLast()
      this.activeList.save()

      checkIconUpdate()
    })

    const body = item.find('.list-body')

    // set title and click event for item activity
    body.find('h1').text(entry.title)
    body.click(e => {
      if (!$(e.target).is('a')) this.setActiveListItem(this.getActiveListItem() !== id && id)
    })

    // attach events to item options
    body.find('.list-options > .fa-close').click(() => {
      this.activeList.addModification(ListModification.fromData(new Date(), handlers.DELETE.command, this.user.id, item.attr('data-id')))
      this.activeList.applyLast()
      this.activeList.save()

      this.renderEntries()
    })

    // append all changes
    body.find('ul').empty()
    entry.changes.forEach(change => {
      const e = this.templateNode.find('.list-item .list-change').clone()
      e.find('.list-change-icon').addClass('fa-' + this.getChangeIconForType(change.type))
      e.find('.list-change-user').text(change.user) // TODO Resolve the user
      e.find('.list-change-time').attr('data-timestamp', change.time.getTime()).text(ago(change.time))
      e.prependTo(body.find('ul'))
    })

    // insert the item into the proper spot
    const items = listNode.children('li')
    if (items.length > 0) {
      items.eq(id).remove()
      items.eq(id - 1).after(item)
    } else {
      listNode.append(item)
    }
  }

  /**
    * @method
    * Renders the entire list, clearing any previously-rendered elements from the
    * list node
    *
    * @param {List} list The List
    */
  renderEntries (list = this.activeList) {
    $('#listNode').empty()
    if (list) {
      for (let i = 0; i < list.entries.length; i++) {
        this.renderEntry(list, i)
      }

      this.setActiveListItem()
    }
  }

  /**
    * @method
    * Renders the collection of lists, clearing any previously-rendered lists from the menu
    */
  renderLists () {
    const menu = $('#menu')
    menu.find('ul').hide().empty().prev().hide()

    if (this.lists.size > 0) {
      menu.find('p').hide()
      const lists = [...this.lists.values()]
      lists.sort((a, b) => { return a.updateTime.getTime() - b.updateTime.getTime() })

      for (const list of lists) {
        // TODO Check if lists are favorited, assign target accordingly
        const target = $('#menuCategory' + (list.isShared() ? 'Shared' : 'Personal'))
        target.show().prev().show()

        const node = this.templateNode.find('.list').clone()
        node.find('.list-icon > .fa').addClass(list.isShared() ? 'fa-users' : 'fa-bars')
        node.find('h1').text(list.title)
        node.find('.list-change-time').text(ago(list.updateTime.getTime()))

        node.click(() => {
          this.activeList = list
          this.renderEntries()
          this.playShiftAnimation(list.title, 'created by ' + list.users[0], true)
        })

        target.append(node)
      }
    } else menu.find('p').show()
  }
}

const app = new App()
app.emit('init')
