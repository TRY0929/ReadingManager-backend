const { env } = require('./env')
const UPLOAD_PATH = env === 'dev' ? '/test/upload/admin-upload-book' : ''
const OLD_UPLOAD_URL = env === 'dev' ? 'http://localhost:8089/book/res/img' : ''

module.exports = {
  OLD_UPLOAD_URL,
  UPLOAD_PATH,
  CODE_ERROR: -1,
  CODE_SUCCESS: 0,
  CODE_TOKEN_EXPIRED: -2,
  debug: true,
  PWD_SALT: 'admin_imooc_node',
  PRIVATE_KEY: 'try0929',
  JWT_EXPIRED: 60 * 60,
  MIME_TYPE_EPUB: 'application/epub+zip',
  UPLOAD_URL: 'http://localhost:8089/admin-upload-book'
}