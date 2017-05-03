'use strict'

const { List } = require('./list')

const LIST_DIR = 'lists'

/**
  * @function
  * Generates a standard JavaScript Error from the given file system error object.
  *
  * @param {number} err The error to handle.
  * @return {Error}
  */
exports.fileErrorHandler = err => {
  if (err instanceof Error) return err
  switch (err.code) {
    case window.FileError.QUOTA_EXCEEDED_ERR:
      return new Error('E_QUOTA_EXCEEDED')
    case window.FileError.NOT_FOUND_ERR:
      return new Error('E_NOT_FOUND')
    case window.FileError.SECURITY_ERR:
      return new Error('E_SECURITY')
    case window.FileError.INVALID_STATE_ERR:
      return new Error('E_INVALID_STATE')
    default:
      return new Error('E_UNKNOWN_' + err.code)
  }
}

// helper function for promise rejection on error callback
const _handle = (reject) => {
  return (err) => { reject(exports.fileErrorHandler(err)) }
}

/**
  * @function
  * Fetches and initializes the file system, storing it within the module.
  * This must be called before any other module functions.
  *
  * @return {Promise}
  */
exports.getFileSystem = () => {
  return new Promise((resolve, reject) => {
    // we need to do a quota request for the browser (debug) platform.
    // the size is un-important, as it should only be used for debugging
    if (window.device.platform === 'browser') {
      window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem

      navigator.webkitPersistentStorage.requestQuota(5 * 1024 * 1024, bytes => {
        window.requestFileSystem(window.LocalFileSystem.PERSISTENT, bytes, fs => {
          exports.fs = fs
          resolve()
        }, _handle(reject))
      }, _handle(reject))
    } else {
      window.resolveLocalFileSystemURL(cordova.file.dataDirectory, fs => {
        exports.fs = fs
        resolve()
      }, _handle(reject))
    }
  })
}

/**
  * @function
  * Fetches the DirectoryEntry for the directory lists should be stored in
  *
  * @return {Promise<DirectoryEntry>}
  */
exports.getListDir = () => {
  return new Promise((resolve, reject) => {
    exports.fs.root.getDirectory('lists', { create: true }, resolve, _handle(reject))
  })
}

/**
  * @function
  * Reads the list from the given uuid, returning `undefined` if not found.
  * Note that this does not create a list from the data, but only reads it.
  *
  * @param {string} uuid The UUID of the list.
  * @return {Promise<string>}
  */
exports.readList = uuid => {
  return exports.getListDir().then(dir => {
    return new Promise((resolve, reject) => {
      // get the FileEntry from the dir, resolving empty if not found
      dir.getFile(uuid, { }, fileEntry => {
        // create a file objects from the entry and read its contents
        fileEntry.file(file => {
          resolve(new window.FileReader().readAsText(file))
        }, _handle(reject))
      }, err => {
        if (err.code === window.FileError.NOT_FOUND_ERR) resolve()
        else reject(exports.fileErrorHandler(err))
      })
    })
  })
}

/**
  * @function getList(string)
  * Gets the List from the given uuid, returing `undefined` if not found.
  *
  * @param uuid The UUID of the list.
  * @return Promise<List>
  */
exports.getList = uuid => {
  return exports.readList().then(data => {
    if (!data) return

    return new List(data, uuid)
  })
}
