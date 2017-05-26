'use strict'

exports.ANIMATION_TIME = 400

exports.LIST_DESC_PREFIX = 'created by '

/**
  * @function
  * Plays the shift animation with the given title, desc, and direction
  *
  * @param {App} app The WeToDo app
  * @param {string} title The title
  * @param {desc} desc The description
  * @param {boolean} isRight Whether or not the the animation is right or left
  */
exports.shift = (app, title, desc, isRight) => {
  const h1 = $('#headerTitle')
  const h2 = $('#headerSubtitle')
  const height = `-${app.headerHeight}px`

  h1.css('top', 0).velocity({ top: height }, exports.ANIMATION_TIME, [ 250, 20 ])
  h2.css('top', 0).velocity({ top: height }, exports.ANIMATION_TIME + 50, [ 250, 20 ])

  $('.body-content').velocity({
    left: isRight ? '-100vw' : 0
  }, {
    duration: exports.ANIMATION_TIME,
    easing: [ 250, 20 ],
    complete: () => {
      h1.text(title).css('top', height).velocity({ top: 0 }, exports.ANIMATION_TIME, [ 250, 20 ])
      h2.text(desc).css('top', height).velocity({ top: 0 }, exports.ANIMATION_TIME + 50, [ 250, 20 ])

      if (isRight) h2.append($(`<span data-user="${app.activeList.users[0]}">Unknown</span>`))
    }
  })
}

/**
  * @function
  * Plays the shift animation to the menu, setting the title and description accordingly
  *
  * @param {App} app The WeToDo app
  */
exports.shiftToMenu = app => {
  if (app.user.provider === 'local') exports.shift(app, 'Hi, User', 'Not Signed In')
  else {
    let name = app.user.data.name
    name = name.indexOf(' ') > 0 ? name.substring(0, name.indexOf(' ')) : name

    exports.shift(app, 'Hi, ' + name, app.getUserResolutionText('premium', app.user) + ' Account')
  }
}

/**
  * @function
  * Plays the shift animation to the active list of the app
  *
  * @param {App} app The WeToDo app
  */
exports.shiftToList = app => {
  exports.shift(app, app.activeList.title, exports.LIST_DESC_PREFIX + ' ', true)
}
