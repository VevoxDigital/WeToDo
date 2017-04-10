'use strict'

const { List, ListModification } = require('./lib/list')

const ago = require('node-time-ago')

class App {
  constructor () {
    // DEBUG
    const list = new List(undefined, 'Example List', 'gh:1234')

    list.addModification(new ListModification(`${new Date().getTime() - 10000} CREATE gh:1234 note|Example Note`))
    list.addModification(new ListModification(`${new Date().getTime()} CREATE gh:1234 note|Another Thing`))

    list.reset()

    this.on('init', () => {
      console.log('init')
    })
    this.on('deviceready', () => {
      console.log('ready')

      setInterval(() => {
        const times = $('#listNode .list-change-time')
        times.html(ago(Number.parseInt(times.attr('data-timestamp'), 10)))
      }, 1000 * 60)

      Object.defineProperty(this, 'templateNode', { value: $('#listTemplateNode') })
      this.renderList(list)
    })
  }

  on (eventName, handler) {
    $(document).bind(eventName, handler)
  }

  emit (eventName, data) {
    $(document).trigger(eventName, data)
  }

  getChangeIconForType (type) {
    switch (type) {
      case 'CREATE': return 'plus'

      default: return 'question'
    }
  }

  setActiveListItem (item) {
    const nodes = $('#listNode').find('li > .list-body')
    nodes.find('p').hide()
    nodes.find('.list-options').hide()
    nodes.find('ul > li:not(:nth-child(1))').hide()

    if (typeof item === 'number') {
      const node = nodes.eq(item)
      node.find('p').show()
      node.find('.list-options').show()
      node.find('ul > li').show()
    }
  }

  renderEntry (list, id) {
    const listNode = $('#listNode')

    const item = this.templateNode.find('.list-item').clone()
    const entry = list.entries[id]

    item.addClass('list-item-' + entry.type)
    item.attr('data-id', id)

    const body = item.find('.list-body')

    body.find('h1').html(entry.title)

    body.find('ul').empty()
    entry.changes.forEach(change => {
      const e = this.templateNode.find('.list-change').clone()
      e.find('.list-change-icon').addClass('fa-' + this.getChangeIconForType(change.type))
      e.find('.list-change-user').html(change.user) // TODO Resolve the user
      e.find('.list-change-time').attr('data-timestamp', change.time.getTime()).html(ago(change.time))
      e.appendTo(body.find('ul'))
    })

    const items = listNode.children('li')
    if (items.length > 0) {
      items.eq(id).remove()
      items.eq(id - 1).after(item)
    } else {
      listNode.append(item)
    }
  }

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
