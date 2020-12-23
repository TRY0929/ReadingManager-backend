const Book = require('../models/Book')
const db = require('../db')
const _ = require('lodash')

// 判断电子书是否存在
const exists = (book) => {
  const { title, author, publisher } = book
  return db.queryOne(`select * from book where title='${title}' and author='${author}' and publisher='${publisher}'`)
}

// 移除这本电子书
const removeBook = async (book) => {
  if (book) {
    // 从本地删除
    book.reset()
    if (book.fileName) {
      const removeBookSql = `delete from book where fileName='${book.fileName}'`
      const removeContentsSql = `delete from contents where fileName='${book.fileName}'`
      await db.querySql(removeBookSql)
      await db.querySql(removeContentsSql)
      console.log('从数据库里删除')
    }
  }
}

// 在book-contents表里插入数据
const insertContents = (book) => {
  return new Promise(async (resolve, reject) => {
    const contents = book.getContents()
    if (contents && contents.length > 0) {
      contents.forEach(async (content, index) => {
        const _contents = _.pick(content, [
          'fileName',
          'id',
          'href',
          'order',
          'level',
          'label',
          'pid',
          'navId',
          'text'
        ])
        await db.insert(_contents, 'contents')
      })
      resolve()
    }
  })
}

// 在数据库表里插入book数据
const insertBook = (book) => {
  return new Promise( async (resolve, reject) => {
    try {
      // 1. 确定是book对象
      if (book instanceof Book) {
        // 2. 确保电子书不存在
        const result = await exists(book)
        if (result) {
          await removeBook(book)
          reject(new Error('电子书已存在'))
        } else {
          // 3. 在数据库表里插入book数据
          await db.insert(book.toDb(), 'book')
          // 4. 在另一张表(书本目录)里插入book部分相关数据
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

const getBook = (fileName) => {
  return new Promise(async (resolve, reject) => {
    const bookSql = `select * from book where fileName='${fileName}'`
    const contentsSql = `select * from contents where fileName='${fileName}' order by \`order\``
    const book = await db.queryOne(bookSql)
    const contents = await db.querySql(contentsSql)
    if (book) {
      book.cover = Book.getCoverUrl(book)
      book.chapterTree = Book.genContentsTree(contents)
      resolve(book)
    } else {
      reject(new Error('电子书不存在'))
    }
  })
}

// 更新电子书
const updateBook = (book) => {
  return new Promise( async (resolve, reject) => {
    try {
      if (book instanceof Book) {
        console.log(book)
        const result = await getBook(book.fileName)
        if(result) {
          const model = book.toDb()
          if(+result.updateType === 0) {
            reject(new Error('内置图书不能编辑'))
          } else {
            await db.update(model, 'book', `where fileName='${book.fileName}'`)
            resolve()
          }
        }
      } else {
        resolve(new Error('电子书格式不正确'))
      }
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = {
  insertBook,
  getBook,
  updateBook
}