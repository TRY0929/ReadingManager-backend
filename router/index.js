const express = require('express')
const boom = require('boom')
const userRouter = require('./user')
const bookRouter = require('./book')
const jwtAuth = require('../router/jwt')
const Result = require('../models/Result')

const {
  CODE_ERROR
} = require('../utils/constant')

const router = express.Router()
router.use(jwtAuth)

router.get('/', (req, res) => {
  res.send('欢迎来到读书管理后台')
})

router.use('/user', userRouter)
router.use('/book', bookRouter)

/* 集中处理404错误
    必须放在正常处理流程之后，不然会拦截正常请求
    后面必须接异常处理中间件
*/
router.use((req, res, next) => {
  next(boom.notFound('接口不存在'))
})

/*
  异常处理
  放在所有路由最后
  参数不能少
*/

router.use((err, req, res, next) => {
  if (err.name && err.name === 'UnauthorizedError') {
    const { status = 401, msg } = err
    new Result(null, 'token验证失败', {
      error: status,
      errorMsg: msg
    }).expired(res.status(err.status))
  } else {
    const msg = (err && err.message) || '系统错误'
    const statusCode = (err.output && err.output.statusCode) || 500
    const errorMsg = (err.output && err.output && err.output.payload && err.output.payload.error) || err.message
    new Result(null, msg, {
      error: statusCode,
      errorMsg
    }).fail(res.status(statusCode))
  }
})

module.exports = router