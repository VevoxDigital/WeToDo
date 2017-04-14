'use strict'

const { List, ListModification } = require('./lib/list')

const ago = require('node-time-ago')

class App {
  constructor () {
    this.on('init', () => { this.onInit() })
    this.on('deviceready', () => { this.onDeviceReady() })

    // TODO DEBUG
    const list = new List(undefined, 'Example List', 'local:0')
    this.activeList = list

    // list.addModification(new ListModification(`${new Date().getTime() - 1000 * 60} CREATE local:1 note|Example Note`))
    // list.addModification(new ListModification(`${new Date().getTime()} CREATE local:0 note|Another Thing`))
    // list.reset()
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
    console.log('init')
  }

  // Fired on 'deviceready' event
  onDeviceReady () {
    console.log('ready')

    // set the updater for time ago on list timestamps
    setInterval(() => {
      $('#listNode .list-change-time').each(function () {
        const times = $(this)
        const time = Number.parseInt(times.attr('data-timestamp'), 10)

        times.html(ago(time - (time % (1000 * 60)))) // only parse to the nearest minute
      })
    }, 1000 * 20) // every 20 seconds...?
    Object.defineProperty(this, 'templateNode', { value: $('#listTemplateNode') })

    this.bindUIEvents()

    // TODO DEBUG
    this.renderList(this.activeList)
  }

  bindUIEvents () {
    const self = this

    const prompt = $('#dialogListPrompt')

    // list options create
    $('#listOptions .fa-plus').click(() => {
      this.showDialog('ListPrompt')
      prompt.find('[type=text]').val('').focus()
    })

    // dialog closing
    $('#dialogs .dialog-close').click(function () {
      self.hideDialog($(this).parent().attr('id').substring(6))
    })

    // confirm list item creation
    prompt.submit(() => {
      const input = prompt.find('[type=text]')

      // TODO Prompt for type
      // TODO Proper user
      this.activeList.addModification(
        ListModification.fromData(new Date(), 'CREATE', 'local:0', `note|${input.val() || 'List Item'}`))

      this.activeList.applyLast()
      this.renderEntry(this.activeList, this.activeList.entries.length - 1)
      this.setActiveListItem(this.getActiveListItem())

      prompt.find('.fa-close').click()
    })
  }

  showDialog (dialog) {
    $('#dialog' + dialog).show()
  }

  hideDialog (dialog) {
    $('#dialog' + dialog).hide()
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

    const body = item.find('.list-body')

    // set title and click event for item activity
    body.find('h1').html(entry.title)
    body.click(e => {
      if (!$(e.target).is('a')) this.setActiveListItem(this.getActiveListItem() !== id && id)
    })

    // append all changes
    body.find('ul').empty()
    entry.changes.forEach(change => {
      const e = this.templateNode.find('.list-change').clone()
      e.find('.list-change-icon').addClass('fa-' + this.getChangeIconForType(change.type))
      e.find('.list-change-user').html(change.user) // TODO Resolve the user
      e.find('.list-change-time').attr('data-timestamp', change.time.getTime()).html(ago(change.time))
      e.appendTo(body.find('ul'))
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
  renderList (list) {
    $('#listNode').empty()
    $('#listName').html(list.title)
    $('#listAuthor').html(`created by ${list.users[0]}`) // TODO Resolve this username

    for (let i = 0; i < list.entries.length; i++) {
      this.renderEntry(list, i)
    }

    this.setActiveListItem()
  }
}

const app = new App()
app.emit('init')
