'use strict'

const { List } = require('./list')

const LIST_DIR = 'lists'

let _fs

/**
  * @function fileErrorHandler(object)
  * Generates a standard JavaScript Error from the given file system error object.
  *
  * @param err The error to handle.
  * @return Error
  */
exports.fileErrorHandler = err => {
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
      return new Error('E_UNKNOWN')
  }
}

// helper function for promise rejection on error callback
const _handle = (reject) => {
  return (err) => { reject(exports.fileErrorHandler(err)) }
}

/**
  * @function fetchFileSystem()
  * Fetches the DirectoryEntry of the file system this app will store its
  * data within. This may prompt for permission on some systems.
  *
  * @return Promise<DirectoryEntry>
  */
exports.getFileSystem = () => {
  return new Promise((resolve, reject) => {
    if (_fs) resolve(_fs)
    window.resolveLocalFileSystemURL(cordova.file.dataDirectory, dirEntry => {
      _fs = dirEntry
      resolve(dirEntry)
    }, _handle(reject))
  })
}

/**
  * @function getListDir()
  * Fetches the DirectoryEntry for the directory lists should be stored in
  *
  * @return Promise<DirectoryEntry>
  */
exports.getListDir = () => {
  return exports.getFileSystem().then(fs => {
    return new Promise((resolve, reject) => {
      fs.getDirectory(LIST_DIR, { create: true }, dir => {
        resolve(dir)
      }, _handle(reject))
    })
  })
}

/**
  * @function readList(string)
  * Reads the list from the given uuid, returning `undefined` if not found.
  * Note that this does not create a list from the data, but only reads it.
  *
  * @param uuid The UUID of the list.
  * @return Promise<string>
  */
exports.readList = uuid => {
  return exports.getListDir().then(dir => {
    return new Promise((resolve, reject) => {
      // get the FileEntry from the dir, resolving empty if not found
      dir.getFile(uuid + '.list', { }, fileEntry => {
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
