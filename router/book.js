const express = require('express')
const Result = require('../models/Result')
const multer = require('multer')
const { UPLOAD_PATH } = require('../utils/constant')

const router = express.Router()

router.post('/upload',
  multer({dest: `${UPLOAD_PATH}/book`}).single('file'),
  (req, res, next) => {
    const file = req.file
    if (!file || file.length === 0) {
      new Result('电子书上传失败').fail(res)
    } else {
      new Result('电子书上传成功').success(res)
    }
  }
)

module.exports = router