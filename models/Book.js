const { MIME_TYPE_EPUB, UPLOAD_URL, UPLOAD_PATH, OLD_UPLOAD_URL } = require('../utils/constant')
const fs = require('fs')
const path = require('path')
const Epub = require('../utils/epub')
const { param } = require('../router/book')
const xml2js = require('xml2js').parseString

class Book {
  constructor(file, data) {
    if (file) {
      this.createBookFromFile(file)
    } else if (data) {
      this.createBookFromData(data)
    }
  }

  // 从用户上传的文件创建电子书
  createBookFromFile(file) {
    const {
      filename,
      mimetype = MIME_TYPE_EPUB,
      destination,
      path
    } = file
    // 电子书后缀名
    const suffix = mimetype === MIME_TYPE_EPUB ? '.epub' : ''
    // 电子书原有路径
    const oldBookPath = path
    // path是在本地的路径 url是线上nginx的路径
    // 电子书本地路径
    const bookPath = `${destination}/${filename}${suffix}`
    // 电子书线上url
    const url = `${UPLOAD_URL}/book/${filename}${suffix}`
    // 电子书解压后文件夹路径
    const unzipPath = `${UPLOAD_PATH}/unzip/${filename}`
    // 电子书解压后文件夹URL
    const unzipUrl = `${UPLOAD_URL}/unzip/${filename}`

    // 创建解压文件夹
    if (!fs.existsSync(unzipPath)) {
      fs.mkdirSync(unzipPath, {recursive: true})
    }
    // 电子书重命名(加上后缀)
    if (fs.existsSync(oldBookPath) && !fs.existsSync(bookPath)) {
      fs.renameSync(oldBookPath, bookPath)
    }
    this.fileName = filename // 文件名
    this.path = `/book/${filename}${suffix}` // 相对epub文件路径
    this.filePath = this.path // epub文件路径
    this.url = url // epub文件url
    this.title = '' // 标题
    this.author = '' // 作者
    this.publisher = '' // 出版社
    this.contents = [] // 目录
    this.cover = '' // 封面图片URL
    this.category = -1 // 分类ID
    this.categoryText = '' // 分类名称
    this.language = '' // 语种
    this.unzipPath = `/unzip/${filename}` // 相对解压后的电子书目录
    this.unzipUrl = unzipUrl // 解压后的电子书链接
    this.originalName = file.originalname //文件原名
  }

  // 从用户输入的信息创建电子书
  createBookFromData(data) {
    this.fileName = data.fileName
    this.cover = data.coverPath
    this.title = data.title
    this.author = data.author
    this.publisher = data.publisher
    this.bookId = data.fileName
    this.language = data.language
    this.rootFile = data.rootFile
    this.originalName = data.originalName
    this.path = data.path || data.filePath
    this.filePath = data.path || data.filePath
    this.unzipPath = data.unzipPath
    this.coverPath = data.coverPath
    this.createUser = data.username
    this.createDt = new Date().getTime()
    this.updateDt = new Date().getTime()
    this.updateType = data.updateType === 0 ? data.updateType : 1
    this.contents = data.contents
  }

  // 电子书解析函数
  parse() {
    return new Promise((resolve, reject) => {
      const bookPath = `${UPLOAD_PATH}${this.filePath}`

      // 如果都没有下载下来肯定没得
      if (!fs.existsSync(bookPath)) {
        throw new Error('电子书不存在')
      }
      const epub = new Epub(bookPath)

      // 电子书解析过程出现任何错误会触发error事件 监听
      epub.on('error', err => {
        reject(err)
      })

      // 电子书解析完毕会触发end事件 监听
      epub.on('end', err => {
        if (err) {
          reject(err)
        } else {
          const {
            title,
            creator,
            creatorFileAs,
            language,
            publisher,
            cover
          } = epub.metadata
          if (!title) {
            throw new Error('图书标题不存在')
          } else {
            // 从解析出来的metadata给电子书对象属性赋值
            this.title = title
            this.author = creator || creatorFileAs || 'unknown'
            this.language = language || 'en'
            this.publisher = publisher || 'unknown'
            this.rootFile = epub.rootFile

            // epub获取图片的回调函数
            const handleGetImage = (err, file, mimetype) => {
              if (err) {
                reject(err)
              } else {
                const suffix = mimetype.split('/')[1]
                const coverPath = `${UPLOAD_PATH}/img/${this.fileName}.${suffix}`
                const coverUrl = `${UPLOAD_URL}/img/${this.fileName}.${suffix}`
                fs.writeFileSync(coverPath, file, 'binary')
                this.coverPath = `/img/${this.fileName}.${suffix}`
                this.cover = coverUrl
                resolve(this)
              }
            }

            // 解压电子书
            try {
              this.unzip()
              // 解析目录
              this.parseContents(epub).then(({ chapters, chapterTree }) => {
                this.contents = chapters
                this.chapterTree = chapterTree
                // 获取封面图片
                epub.getImage(cover, handleGetImage)
              })
            } catch (e) {
              reject(e)
            }
          }
        }
      })
      epub.parse()
    })
  }

  // 解压电子书函数
  unzip() {
    const AdmZip = require('adm-zip')
    // new一个AdmZip对象 传入需要解压的文件路径
    const zip = new AdmZip(Book.genPath(this.filePath))
    // 解压电子书到指定路径 true为若已存在选择覆盖
    zip.extractAllTo(Book.genPath(this.unzipPath), true)
  }

  // 解析电子书目录(好好看看epub解压后的文件 分析结构再看代码)
  parseContents(epub) {
    // 获取ncx路径 ncx是目录所在文件
    function getNcxFilePath() {
      const manifest = epub && epub.manifest
      const spine = epub && epub.spine
      const ncx = spine.toc && spine.toc.href
      const id = spine.toc && spine.toc.id
      if (ncx) {
        // 直接在spine的toc里有
        return ncx
      } else {
        // 在上面那儿没有 但在manifest里肯定写了 通过id拿到(这个id极大概率就是ncx)
        return manifest[id].href
      }
    }
    
    // 找父节点(迭代用) 就是让每个条目找到自己的层级以及父亲
    function findParent(array, level = 0, pid = '') {
      return array.map(item => {
        // 当前条目
        item.pid = pid
        item.level = level
        if (item.navPoint && item.navPoint.length > 0) {
          // 若条目有子目录 且它还是个数组(有多个子目录) 迭代
          item.navPoint = findParent(item.navPoint, level + 1, item['$'].id)
        } else if (item.navPoint) {
          // 条目有子目录 子目录就一个 没必要迭代了 直接赋值
          item.navPoint.level = level + 1
          item.navPoint.pid = item['$'].id
        }
        return item
      })
    }
    
    // 根据刚刚找到的层级及父亲的信息 把树状结构的目录打扁
    function flatten(array) {
      return [].concat(...array.map(item => {
        if (item.navPoint && item.navPoint.length > 0) {
          return [].concat(item, ...flatten(item.navPoint))
        } else if (item.navPoint) {
          return [].concat(item, item.navPoint)
        }
        return item
      }))
    }

    const ncxFilePath =  Book.genPath(`${this.unzipPath}/${getNcxFilePath()}`)
    const ncxDir = path.dirname(ncxFilePath).replace(UPLOAD_PATH, '')
    const unzipPath = this.unzipPath
    if (fs.existsSync(ncxFilePath)) {
      return new Promise((resolve, reject) => {
        // 先拿到刚刚的ncx文件，里面放的是目录的结构(xml文件)
        const xml = fs.readFileSync(ncxFilePath, 'utf-8')
        xml2js(xml, {
          explicitArray: false,
          ignoreAttrs: false
        }, (err, json) => {
          if (err) {
            reject(err)
          } else {
            const navMap = json.ncx.navMap
            if (!navMap.navPoint || navMap.navPoint.length === 0) {
              reject(new Error('电子书目录解析失败，目录数为0'))
            }
            navMap.navPoint = findParent(navMap.navPoint)
            const navPoint = flatten(navMap.navPoint)

            // epub.flow拿到的是epub库初步解析的目录文件 但解析不彻底 可能拿不到数据
            // 所以我们用ncx来进行目录解析
            const flow = epub.flow
            // 放解析后的章节信息
            const chapters = []
            // 遍历flow的每个条目(虽然里面信息可能不完全 但数量还是对的 我们只需要在其基础上加上可能缺失的必要信息即可)
            navPoint.forEach((chapter, index) => {
              const src = chapter.content['$'].src
              
              // 章节的地址
              chapter.text = `${UPLOAD_URL}${ncxDir}/${src}`
              // chapter.text = `${UPLOAD_URL}/unzip/${this.fileName}/${chapter.href}`
              // 章节标题
              chapter.label = chapter.navLabel.text || ''
              chapter.href = `${ncxDir}/${src}`.replace(unzipPath, '')
              chapter.id = src
              chapter.fileName = this.fileName //书名
              chapter.navId = chapter['$'].id //章节id
              chapter.order = index + 1 //章节阅读顺序
              chapters.push(chapter)
            })
            const chapterTree = Book.genContentsTree(chapters)
            
            resolve({ chapters, chapterTree })
          }
        })
      })
    } else {
      throw new Error('对应资源不存在')
    }
  }

  // 获取目录树
  static genContentsTree (chapters) {
    const chapterTree = []
    chapters.forEach(ch => {
      ch.children = []
      if (ch.pid === '') {
        chapterTree.push(ch)
      } else {
        const parent = chapters.find(item => item.navId === ch.pid)
        parent.children.push(ch)
      }
    })
    return chapterTree
  }

  // 静态方法 生成绝对路径
  static genPath(path) {
    // 若路径最没有带 / 则加上
    if (!path.startsWith('/')) {
      path = '/' + path
    }
    return `${UPLOAD_PATH}${path}`
  }

  // 过滤掉不需要存在数据库里的信息
  toDb() {
    return {
      fileName: this.fileName,
      cover: this.coverPath,
      title: this.title,
      author: this.author,
      publisher: this.publisher,
      bookId: this.fileName,
      language: this.language,
      rootFile: this.rootFile,
      originalName: this.originalName,
      filePath: this.filePath,
      unzipPath: this.unzipPath,
      coverPath: this.coverPath,
      createUser: this.username,
      createDt: this.createDt,
      updateDt: this.updateDt,
      updateType: this.updateType
    }
  }

  getContents () {
    return this.contents
  }

  // 从本地删除数据
  reset () {
    if (Book.pathExists(this.filePath)) {
      console.log('删除电子书文件...')
      fs.unlinkSync(Book.genPath(this.filePath))
    }
    if (Book.pathExists(this.coverPath)) {
      console.log('删除封面...')
      fs.unlinkSync(Book.genPath(this.coverPath))
    }
    if (Book.pathExists(this.unzipPath)) {
      console.log('删除解压文件...')
      fs.rmdirSync(Book.genPath(this.unzipPath), { recursive: true })
    }
  }

  // 判断路径是否存在
  static pathExists (path) {
    if (path.startsWith(UPLOAD_PATH)) {
      return fs.existsSync(path)
    } else {
      return fs.existsSync(Book.genPath(path))
    }
  }

  // 获取图片url(新老图书地址兼容)
  static getCoverUrl (book) {
    const { cover } = book
    if (cover) {
      if (+book.updateType === 0) {
        if (cover.startsWith('/')) {
          return `${OLD_UPLOAD_URL}${cover}`
        } else {
          return `${OLD_UPLOAD_URL}/${cover}`
        }
      } else {
        if (cover.startsWith('/')) {
          return `${UPLOAD_URL}${cover}`
        } else {
          return `${UPLOAD_URL}/${cover}`
        }
      }
    } else {
      return null
    }
  }
}

module.exports = Book