const Book = require('../models/Book')
const db = require('../db')

const exists = (book) => {}

const removeBook = (book) => {}

const insertContents = (book) => {}

const insertBook = (book) => {
  return new Promise( async (resolve, reject) => {
    try {
      if (book instanceof Book) {
        const result = await exists(book)
        if (result) {
          await removeBook(book)
          reject(new Error('电子书已存在'))
        } else {
          await db.insert('book', 'book')
          await insertContents(book)
          resolve()
        }
      } else {
        reject(new Error('电子书格式不正确'))
      }
    } catch (e) {
      reject(e)
    }
  })
}

module.exports = {
  insertBook
}