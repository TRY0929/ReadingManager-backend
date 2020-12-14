const mysql = require('mysql')
const {debug} = require('../utils/constant')
const {
  host,
  database,
  user,
  password
} = require('./config')
const {isObject} = require('../utils')

function connect () {
  return mysql.createConnection({
    host,
    user,
    database,
    password,
    multipleStatements: true
  })
}

function querySql (sql) {
  const conn = connect()
  debug && console.log(sql)
  return new Promise((resolve, reject) => {
    try {
      conn.query(sql, (err, results) => {
        if (err) {
          debug && console.log('查询失败，原因:' + JSON.stringify(err))
          reject(err)
        } else {
          debug && console.log('查询成功', JSON.stringify(results))
          resolve(results)
        }
      })
    } catch (err) {
      reject(err)
    } finally {
      conn.end()
    }
  })
}

function queryOne (sql) {
  return new Promise((resolve, reject) => {
    querySql(sql).then(results => {
      if (results && results.length > 0) {
        resolve(results[0])
      } else {
        resolve(null)
      }
    })
    .catch(err => {
      reject(err)
    })
  })
}

function insert (model, tableName) {
  return new Promise((resolve, reject) => {
    if (!isObject(model)) {
      reject('添加图书对象不合法')
    }
  })
}

module.exports = {
  querySql,
  queryOne,
  insert
}