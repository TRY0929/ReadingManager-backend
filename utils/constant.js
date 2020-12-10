const { env } = require('./env')
const UPLOAD_PATH = env === 'dev' ? '/test/upload/admin-upload-book' : ''

module.exports = {
  UPLOAD_PATH,
  CODE_ERROR: -1,
  CODE_SUCCESS: 0,
  CODE_TOKEN_EXPIRED: -2,
  debug: true,
  PWD_SALT: 'admin_imooc_node',
  PRIVATE_KEY: 'try0929',
  JWT_EXPIRED: 60 * 60
}