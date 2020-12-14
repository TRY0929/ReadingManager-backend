const express = require('express')
const Result = require('../models/Result')
const multer = require('multer')
const { UPLOAD_PATH } = require('../utils/constant')
const Book = require('../models/Book')
const boom = require('boom')
const {decoded} = require('../utils')
const bookService = require('../services/book')

const router = express.Router()

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
        console.log('book', book)
        new Result(book, '电子书上传成功').success(res)
      })
      .catch(err => {
        next(boom.badImplementation(err))
      })
    }
  }
)

router.post('/create', (req, res, next) => {
  const decode = decoded(req)
  if (decode && decode.username) {
    req.body.username = decode.username
  }
  const book = new Book(null, req.body)
  bookService.insertBook(book).then(res => {

  }).catch(err => {
    next(boom.badImplementation(err))
  })
})

module.exports = router