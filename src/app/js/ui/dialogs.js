'use strict'

const { List, ListModification } = require('../lib/list')
const { handlers } = require('../lib/list-handlers')
const data = require('../lib/data')
const ui = require('./')

exports.ANIMATION_DURATION = 200

/**
  * @function
  * Shows the given dialog
  *
  * @param {string} dialog The dialog to show
  * @return {Element} The dialog shown
  */
exports.show = dialog => {
  const d = $('#dialog' + dialog)
  const cover = d.find('.dialog-cover')

  d.show().velocity({
    top: 0,
    opacity: 1
  }, {
    duration: exports.ANIMATION_DURATION,
    easing: 'ease-out',
    complete: () => {
      d.find('.dialog-bg').one('click', () => {
        d.find('.dialog-close').click()
      })

      cover.velocity({
        top: '100%',
        height: '5px'
      }, exports.ANIMATION_DURATION)
    }
  })

  return d
}

/**
  * @function
  * Shows the given dialog, then focuses the element given. If a value is
  * specified, the element's value is set to it.
  *
  * @param {string} dialog The dialog to show
  * @param {string} element The element to focus
  * @param {string} [value] The value to fill
  * @return {Element} The dialog shown
  */
exports.showAndFocus = (dialog, element, value) => {
  const d = exports.show(dialog)
  const e = d.find(element).focus()
  if (value) e.val(value)

  return d
}

/**
  * @function
  * Hides the given dialog
  *
  * @param {string} dialog The dialog to hide
  */
exports.hide = dialog => {
  const d = $('#dialog' + dialog)
  const cover = d.find('.dialog-cover')

  cover.velocity({
    top: 0,
    height: '100%'
  }, {
    duration: exports.ANIMATION_DURATION,
    complete: () => {
      d.velocity({
        opacity: 0,
        top: '-100%'
      }, {
        duration: exports.ANIMATION_DURATION,
        easing: 'ease-in',
        complete: () => { d.hide() }
      })
    }
  })
}

/**
  * @function
  * Prompts the user with a confirmation dialog
  *
  * @param {string} message The message to prompt with
  * @param {function} cb The callback, called if the user confirms
  */
exports.confirm = (message, cb) => {
  const dialog = $('#dialogConfirm')
  dialog.find('.target').text(message)
  dialog.find('.btn-confirm').one('click', () => {
    dialog.find('.dialog-close').click()
    cb()
  })
  exports.show('Confirm')
}

/**
  * @function
  * Sends an alert to the user
  *
  * @param {string} message The message to send
  */
exports.alert = message => {
  const dialog = $('#dialogAlert')
  dialog.find('.target').html(message)
  exports.show('Alert')
}

/**
  * @function
  * Binds all dialog events to their respective dialogs
  *
  * @param {App} app The WeToDo app
  */
exports.bindDialogEvents = app => {
  // dialog closing
  $('#dialogs .dialog-close').click(function () {
    exports.hide($(this).parent().attr('id').substring(6))
  })

  // confirmation dialog
  const dialogConfirm = $('#dialogConfirm')
  dialogConfirm.find('.btn-cancel').click(() => { dialogConfirm.find('.dialog-close').click() })

  // alert dialog
  const dialogAlert = $('#dialogAlert')
  dialogAlert.find('.btn-confirm').click(() => { dialogAlert.find('.dialog-close').click() })

  // bind other dialog events
  exports.bindDialogNewList(app)
  exports.bindDialogListEdit(app)
  exports.bindDialogNewListItem(app)
  exports.bindDialogListItemEdit(app)
}

/**
  * @function
  * @private
  * Binds the NewList dialog
  */
exports.bindDialogNewList = app => {
  const prompt = $('#dialogListPrompt')
  $('#menu > button').click(() => {
    exports.show('ListPrompt')
    prompt.find('[type=text]').val('').focus()
  })

  prompt.submit(() => {
    const input = prompt.find('[type=text]').val()
    const list = new List(null, input || 'List', app.user.id)

    app.lists.set(list.uuid, list)
    ui.renderer.renderLists(app)

    list.save()

    prompt.find('.dialog-close').click()
  })
}

/**
  * @function
  * @private
  * Binds the ListEdit dialog
  *
  * @param {App} app The WeToDo app
  */
exports.bindDialogListEdit = app => {
  const prompt = $('#dialogListEditPrompt')
  $('#listOptions .fa-cog').click(() => {
    if (!app.activeList || app.activeList.users[0] !== app.user.id) return
    ui.dialogs.show('ListEditPrompt')
    prompt.find('[type=text]').val(app.activeList.title).focus()
  })
  prompt.submit(() => {
    const input = prompt.find('[type=text]')

    app.activeList.modifyAndSave(ListModification.create(handlers.LISTRENAME.command, app.user, input.val() || 'List'))
    ui.renderer.renderLists(app)

    prompt.find('.dialog-close').click()
    ui.animator.shiftToList(app)
  })
  prompt.find('.dialog-options > .fa-close').click(() => {
    prompt.find('.dialog-close').click()
    ui.dialogs.confirm('Really delete this list? This action cannot be undone!', () => {
      data.deleteList(app.activeList.uuid)
      app.lists.delete(app.activeList.uuid)
      app.activeList = undefined

      ui.renderer.renderLists(app)
      ui.animator.shiftToMenu(app)
    })
  })
}

/**
  * @function
  * @private
  * Binds the NewListItem dialog
  */
exports.bindDialogNewListItem = app => {
  const prompt = $('#dialogListItemPrompt')
  $('#listOptions .fa-plus').click(() => {
    ui.dialogs.show('ListItemPrompt')
    prompt.find('[type=text]').val('').focus()
  })
  const addListItem = (type, val) => {
    app.activeList.modifyAndSave(ListModification.create(handlers.CREATE.command, app.user, `${type}|${val || 'Item'}`))
    ui.renderer.renderLastEntry(app, app.activeList)

    app.setActiveListItem(app.getActiveListItem())
    prompt.find('.dialog-close').click()
  }
  const input = prompt.find('[type=text]')
  prompt.submit(() => {
    addListItem('check', input.val())
  })
  prompt.find('.dialog-options > a').click(function () {
    addListItem($(this).attr('data-type'), input.val())
  })
}

/**
  * @function
  * @private
  * Binds the ListItemEdit dialog
  */
exports.bindDialogListItemEdit = app => {
  const prompt = $('#dialogListItemEditPrompt')

  const clearData = () => {
    prompt.find('[name="title"]').val('')
    prompt.find('[name="desc"]').val('').show()
    prompt.find('.dialog-close').click()
    ui.renderer.renderEntries(app)
  }

  prompt.find('form').submit(() => {
    const entry = app.activeList.entries[Number.parseInt(prompt.attr('data-item-id'), 10)]

    if (prompt.find('[name="title"]').val() !== entry.title) {
      app.activeList.addModification(
        ListModification.create(handlers.RENAME.command, app.user, `${prompt.attr('data-item-id')}|${prompt.find('[name="title"]').val()}`)
      )
      app.activeList.applyLast()
    }
    if (prompt.find('[name="desc"]').val() !== entry.description) {
      app.activeList.addModification(
        ListModification.create(handlers.CHANGEDESC.command, app.user, `${prompt.attr('data-item-id')}|${prompt.find('[name="desc"]').val()}`)
      )
      app.activeList.applyLast()
    }

    app.activeList.save()

    clearData()
  })
}
