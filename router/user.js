const express = require('express')
const { body, validationResult } = require('express-validator')
const boom = require('boom')
const jwt = require('jsonwebtoken')
const Result = require('../models/Result')
const {login, findUser} = require('../services/user')
const {md5, decoded} = require('../utils')
const {PWD_SALT, PRIVATE_KEY, JWT_EXPIRED} = require('../utils/constant')

const router = express.Router()
router.get('/info', (req, res) => {
  const token = decoded(req)
  if (token && token.username) {
    findUser(token.username).then(user => {
      if (user) {
        user.roles = [user.role]
        new Result(user, '获取用户信息成功').success(res)
      } else {
        new Result('获取用户信息失败').fail(res)
      }
    })
  }
})

router.post('/login',
  [
    body('username').isString().withMessage('username类型不正确'),
    body('password').isString().withMessage('password类型不正确')
  ],
  (req, res, next) => {
    const err = validationResult(req)
    if (!err.isEmpty()) {
      const [{msg}] = err.errors
      next(boom.badRequest(msg))
    } else {
      let {username, password} = req.body
      password = md5(`${password}${PWD_SALT}`)
      login(username, password).then(user => {
        if (!user || user.length === 0) {
          new Result('登录失败').fail(res)
        } else {
          const token = jwt.sign(
            { username },
            PRIVATE_KEY,
            { expiresIn: JWT_EXPIRED }
          )
          new Result({token}, '登录成功').success(res)
        }
      })
    }
  // res.json({
  //   code: 0,
  //   msg: '登录成功'
  // })
})

router.post('/logout', (req, res) => {
  
})

module.exports = router