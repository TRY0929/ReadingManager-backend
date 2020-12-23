const express = require('express')
const Result = require('../models/Result')
const multer = require('multer')
const { UPLOAD_PATH } = require('../utils/constant')
const Book = require('../models/Book')
const boom = require('boom')
const {decoded} = require('../utils')
const bookService = require('../services/book')

const router = express.Router()

// 图书上传
router.post('/upload',
  multer({dest: `${UPLOAD_PATH}/book`}).single('file'),
  (req, res, next) => {
    const file = req.file
    if (!file || file.length === 0) {
      new Result('电子书上传失败').fail(res)
    } else {
      const book = new Book(file)
      book.parse()
      .then(book => {
        new Result(book, '电子书上传成功').success(res)
      })
      .catch(err => {
        next(boom.badImplementation(err))
      })
    }
  }
)

// 图书创建
router.post('/create', (req, res, next) => {
  const decode = decoded(req) // 从token中获取用户信息
  if (decode && decode.username) {
    req.body.username = decode.username
  }
  // 用数据的方式创建Book
  const book = new Book(null, req.body)
  // 在数据表里插入book数据
  console.log(book)
  bookService.insertBook(book).then(() => {
    new Result('添加电子书成功').success(res)
  }).catch(err => {
    next(boom.badImplementation(err))
  })
})

// 获取图书信息
router.get('/get', async (req, res, next) => {
  if (req.query && req.query.fileName) {
    const fileName = req.query.fileName
    bookService.getBook(fileName).then(book => {
      if(book) {
        new Result(book, '获取电子书信息成功').success(res)
      } else {
        next(boom.notFound())
      }
    })
    .catch(err => {
      next(boom.badImplementation(err))
    })
  } else {
    next(boom.badRequest(new Error('参数fileName不能为空')))
  }
})

// 更新图书
router.post('/update', async (req, res, next) => {
  const decode = decoded(req)
  if(decode && decode.username) {
    req.body.username = decode.username
  }
  const book = new Book(null, req.body)
  bookService.updateBook(book).then(() => {
    new Result(null, '更新电子书信息成功').success(res)
  })
    .catch(err => {
      next(boom.badImplementation(err))
    }) 
})

module.exports = router