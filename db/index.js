const mysql = require('mysql')
const {debug} = require('../utils/constant')
const {
  host,
  database,
  user,
  password
} = require('./config')
const {isObject} = require('../utils')
const db = require('../db')

// 数据库连接函数
function connect () {
  return mysql.createConnection({
    host,
    user,
    database,
    password,
    multipleStatements: true
  })
}

// 执行查询语句sql(查询所有)
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

// 查询一条记录(调用了上面的querySql)
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

// 向数据库表里插入数据
function insert (model, tableName) {
  return new Promise((resolve, reject) => {
    if (!isObject(model)) {
      reject('添加图书对象不合法')
    }
    const keys = []
    const values = []
    Object.keys(model).forEach(item => {
      if (model.hasOwnProperty(item)) {
        keys.push(`\`${item}\``)
        values.push(`\'${model[item]}\'`)
      }
    })
    if (keys.length > 0) {
      let sql = `INSERT INTO \`${tableName}\` (`
      const keyString = keys.join(',')
      const valueString = values.join(',')
      sql = `${sql}${keyString}) VALUES (${valueString})`
      const conn = connect()
      try {
        conn.query(sql, (err, res) => {
          if (err) {
            reject(err)
          } else {
            resolve(res)
          }
        })
      } catch (error) {
        reject(error)
      } finally {
        conn.end()
      }
    }
  })
}

function update (model, tableName, where) {
  return new Promise((resolve, reject) => {
    if(!isObject(model)) {
      reject(new Error('传入图书对象不合法'))
    }
    const entry = []
    // update tableName set a=v1,b=v2 where
    Object.keys(model).forEach(key => {
      if(model.hasOwnProperty(key)) {
        entry.push(`\`${key}\`='${model[key]}'`)
      }
    })
    if(entry.length > 0) {
      let sql = `UPDATE \`${tableName}\` SET`
      sql = `${sql} ${entry.join(',')} ${where}`
      const conn = connect()
      try {
        conn.query(sql, (err, result) => {
          if(err) {
            reject(err)
          } else {
            resolve(result)
          }
        })
      } catch (error) {
        reject(error)
      } finally {
        conn.end()
      }
    }
  })
}

module.exports = {
  querySql,
  queryOne,
  insert,
  update
}