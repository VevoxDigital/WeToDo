'use strict'

const assert = require('assert')

const { List, ListEntry, ListModification } = require('../lib/list')
const { handlers } = require('../lib/list-handlers')

const ui = require('./')

exports.NODE_ID = '#listNode'
exports.TEMPLATE_NODE_ID = '#listTemplateNode'

/**
  * @method
  * Renders all entries from the app's active list
  *
  * @param {App} app The WeToDo app
  */
exports.renderEntries = app => {
  $(exports.NODE_ID).empty()

  if (app.activeList) {
    for (let i = 0; i < app.activeList.entries.length; i++) exports.renderEntry(app, app.activeList.entries[i], i)
    app.setActiveListItem()
  }
}

/**
  * @function
  * Renders the last entry in the given list
  *
  * @param {App} app The WeToDo app
  * @param {List} list The list
  */
exports.renderLastEntry = (app, list) => {
  assert.ok(list instanceof List, 'Expected List, got ' + (list && list.constructor.name))

  const id = list.entries.length - 1
  exports.renderEntry(app, list.entries[id], id)
}

/**
  * @function
  * Renders the entry at the given position in the given list. If a rendered element
  * already exists for that entry, it is removed and re-rendered.
  *
  * @param {App} app The WeToDo app
  * @param {ListEntry} entry The entry
  * @param {number} id The index of the entry
  */
exports.renderEntry = (app, entry, id) => {
  assert.ok(entry instanceof ListEntry, 'Expected ListEntry, got ' + (entry && entry.constructor.name))
  assert.strictEqual(typeof id, 'number')

  const node = $(exports.NODE_ID)
  node.find(`[data-id=${id}]`).remove()

  // create a new element to begin rendering
  const element = app.templateNode.find('.list-item').clone()
  element.addClass('.list-item-' + entry.type).attr('data-id', id)
  element.find('h1').text(entry.title)

  exports.renderEntryIcon(app, entry, element)
  exports.renderEntryChanges(app, entry, element)

  // set active list item on click
  element.click(e => {
    if ($(e.target).is('a')) return
    app.setActiveListItem(app.getActiveListItem() !== id && id)
  })

  // bind options
  element.find('.list-options > .fa-close').click(() => {
    app.activeList.modifyAndSave(ListModification.create(handlers.DELETE.command, app.user, id))
    exports.renderEntries(app.activeList)
  })

  // insert the item into the proper spot
  const items = node.children('li')
  if (items.length > 0) {
    items.eq(id).remove()
    items.eq(id - 1).after(element)
  } else node.append(element)
}

/**
  * @function
  * @private
  * Renders the icon for a given ListEntry onto a given ListItem element
  *
  * @param {App} app The WeToDo app
  * @param {ListEntry} entry The entry to render
  * @param {Element} element The jQuery DOM element to render onto
  */
exports.renderEntryIcon = (app, entry, element) => {
  const icon = element.find('.list-icon > a')
  icon.addClass(exports.getEntryIconFromType(entry.type))

  if (entry.type === 'check') {
    /* eslint no-script-url: 0 */
    icon.attr('href', 'javascript:')
    exports.updateEntryCheckState(entry, icon)

    icon.click(() => {
      app.activeList.modifyAndSave(ListModification.create(handlers.CHECK.command, app.user, element.attr('data-id')))

      exports.renderEntryChanges(app, entry, element)
      exports.updateEntryCheckState(entry, icon)
    })
  }
}

/**
  * @function
  * @private
  * Gets an icon class for the given ListEntry type
  *
  * @param {string} type The type
  * @return {string} The class to add
  */
exports.getEntryIconFromType = type => {
  switch (type) {
    case 'check': return 'fa-minus'
    default: return 'fa-ellipsis-v'
  }
}

/**
  * @function
  * @private
  * Updates the "checked" state of the given ListEntry's icon
  *
  * @param {ListEntry} entry The entry
  * @param {Element} icon The DOM icon for the entry
  */
exports.updateEntryCheckState = (entry, icon) => {
  if (entry.checked) icon.addClass('fa-check').removeClass('fa-minus')
  else icon.removeClass('fa-check').addClass('fa-minus')
}

/**
  * @function
  * @private
  * Renders the changes made to a ListEntry to an element
  *
  * @param {ListEntry} entry The entry to render from
  * @param {Element} element The element to render to
  */
exports.renderEntryChanges = (app, entry, element) => {
  const body = element.find('.list-body')

  body.find('ul').empty()
  entry.changes.forEach(change => {
    const e = app.templateNode.find('.list-item .list-change').clone()
    e.find('.list-change-icon').addClass('fa-' + exports.getChangeIconForType(change.type))
    e.find('.list-change-user').text('Unknown').attr('data-user', change.user)
    e.find('.list-change-time').attr('data-timestamp', change.time.getTime()).text(app.ago(change.time))
    e.prependTo(body.find('ul'))
  })

  app.setActiveListItem(app.getActiveListItem())
}

/**
  * @function
  * @private
  * Gets the FA icon to be used with the specific type of change.
  *
  * @param {string} type The type
  * @return {string} The icon name, without the 'fa-'
  */
exports.getChangeIconForType = type => {
  switch (type) {
    case 'CREATE': return 'plus'
    case 'CHECK': return 'check'
    case 'UNCHECK': return 'minus'

    default: return 'question'
  }
}

/**
  * @function
  * Renders the lists for the given app
  *
  * @param {App} app The WeToDo app
  */
exports.renderLists = app => {
  const menu = $('#menu')
  menu.find('ul').hide().empty().prev().hide()

  if (app.lists.size > 0) {
    menu.find('p').hide()
    const lists = [...app.lists.values()]
    lists.sort((a, b) => { return a.updateTime.getTime() - b.updateTime.getTime() })

    for (const list of lists) {
      // TODO Check if lists are favorited, assign target accordingly
      const target = $('#menuCategory' + (list.isShared() ? 'Shared' : 'Personal'))
      target.show().prev().show()

      const node = app.templateNode.find('.list').clone()
      node.find('.list-icon > .fa').addClass(list.isShared() ? 'fa-users' : 'fa-bars')
      node.find('h1').text(list.title)
      node.find('.list-change-time').text(app.ago(list.updateTime.getTime()))

      node.click(() => {
        app.activeList = list
        exports.renderEntries(app)

        ui.animator.shiftToList(app)
      })

      target.append(node)
    }
  } else menu.find('p').show()
}
