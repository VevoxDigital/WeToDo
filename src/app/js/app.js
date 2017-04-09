'use strict'

const { List, ListModification } = require('./lib/list')

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

  renderEntry (list, id) {
    const listNode = $('#listNode')

    const item = this.templateNode.find('.list-item').clone()
    const entry = list.entries[id]

    item.addClass('list-item-' + entry.type)
    item.attr('data-id', id)

    item.find('.list-body > h1').html(entry.title)

    item.find('.list-body > p').hide()
    item.find('.list-body > .list-options').hide()

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
  }
}

const app = new App()
app.emit('init')
