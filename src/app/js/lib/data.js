'use strict'

const assert = require('assert')

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
    exports.fs.root.getDirectory(LIST_DIR, { create: true }, resolve, _handle(reject))
  })
}

/**
  * @function
  * Gets an Array of FileEntries representing the lists in the list directory.
  *
  * @return {Promise<Array<FileEntry>>}
  */
exports.getListEntries = () => {
  return exports.getListDir().then(dir => {
    return new Promise((resolve, reject) => {
      const reader = dir.createReader()
      let entries = []

      const read = () => {
        reader.readEntries(results => {
          if (results.length) {
            entries = entries.concat(Array.prototype.slice.call(results, 0))
            read()
          } else resolve(entries.sort())
        })
      }
      read()
    })
  })
}

/**
  * @function
  * Reads the list from the given uuid or FileEntry, returning `undefined` if not found.
  * Note that this does not create a list from the data, but only reads it.
  *
  * @param {string|FileEntry} entry The UUID or entry of the list.
  * @return {Promise<string>}
  */
exports.readList = entry => {
  assert.ok(typeof entry === 'string' || entry.constructor.name === 'FileEntry',
    `expected string or FileEntry, got ${entry.constructor.name}`)

  const read = (fileEntry, resolve, reject) => {
    fileEntry.file(file => {
      const reader = new window.FileReader()

      reader.onloadend = function () {
        resolve(this.result)
      }

      reader.readAsText(file)
    }, _handle(reject))
  }

  return exports.getListDir().then(dir => {
    return new Promise((resolve, reject) => {
      if (typeof entry === 'string') {
        // get the FileEntry from the dir, resolving empty if not found
        dir.getFile(entry, { }, fileEntry => {
          // create a file objects from the entry and read its contents
          read(fileEntry, resolve, reject)
        }, err => {
          if (err.code === window.FileError.NOT_FOUND_ERR) resolve()
          else reject(exports.fileErrorHandler(err))
        })
      } else read(entry, resolve, reject)
    })
  })
}

/**
  * @function
  * Saves the given List to the file system
  *
  * @param {List} list The list to save
  * @return {Promise}
  */
exports.saveList = list => {
  assert.ok(list.constructor && list.constructor.name === 'List', `expected List, got ${list.constructor.name}`)
  return exports.getListDir().then(dir => {
    return new Promise((resolve, reject) => {
      dir.getFile(list.uuid, { create: true }, fileEntry => {
        fileEntry.createWriter(fileWriter => {
          // we have a FileWriter, we'll be writing List#toString() to it
          fileWriter.onwriteend = resolve
          fileWriter.onerror = reject
          fileWriter.write(new window.Blob([ list.toString() ], { type: 'text/plain' }))
        }, _handle(reject))
      }, _handle(reject))
    })
  })
}
