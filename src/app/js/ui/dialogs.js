'use strict'

const { List, ListModification } = require('../lib/list')
const { handlers } = require('../lib/list-handlers')
const data = require('../lib/data')
const ui = require('./')

/**
  * @function
  * Shows the given dialog
  *
  * @param {string} dialog The dialog to show
  */
exports.show = dialog => {
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

/**
  * @function
  * Hides the given dialog
  *
  * @param {string} dialog The dialog to hide
  */
exports.hide = dialog => {
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
  dialogConfirm.find('.btn-cancel').click(dialogConfirm.find('.dialog-close').click)

  // bind other dialog events
  exports.bindDialogNewList(app)
  exports.bindDialogListEdit(app)
  exports.bindDialogNewListItem(app)
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

    app.activeList.modifyAndSave(ListModification.create(handlers.LISTRENAME.command, app, input.val() || 'List'))
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
      ui.animator.shiftToHome(app)
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