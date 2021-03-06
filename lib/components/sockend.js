const crypto = require('crypto')
const debug = require('debug')('taube-sockend')
const Requester = require('./requester')
const errors = require('./errors')
const { getPort } = require('../http')
const config = require('../config')
const converter = require('../helpers/converter')

class Sockend {
  constructor(io) {
    this.io = io
    this.id = crypto.randomBytes(16).toString('hex')
    this.namespaces = {}
    this.requesterTransformators = []
  }

  async addNamespace(options) {
    if (!options.namespace) throw new Error('options.namespace required')
    if (!options.requester) throw new Error('options.requester required')
    if (!options.requester.uri) throw new Error('options.requester.uri required')

    if (!options.requester.key) options.requester.key = 'default'

    if (this.namespaces[options.namespace]) {
      throw new Error(`Namespace ${options.namespace} already exists`)
    }
    const namespace = new Namespace(options, this)
    this.namespaces[namespace.namespace] = namespace
    return await namespace.init()
  }

  getNamespace(name) {
    return this.namespaces[name]
  }

  isReady() {
    return this.io.httpServer.listening
  }
}

class Namespace {
  constructor(options, sockend) {
    this.sockend = sockend
    this.namespace = options.namespace
    this.requester = new Requester({
      key: options.requester.key,
      uri: options.requester.uri,
      port: options.requester.port,
      userAgentComponent: `Sockend`
    })
    // Build full URI
    const escapedKey = converter.escape(this.requester.key)
    const port = config.testing ? getPort() : this.requester.port
    this.fullRequesterURI = `${this.requester.uri}:${port}/${escapedKey}`

    this.additionalOn = []
    // Initialize socket.io
    this.socketNamespace = this.sockend.io.of(`/${this.namespace}`)
    this.socketMiddlewareFns = []
  }

  allowTopic(topic) {
    if (!topic) throw new Error('Parameter topic required.')
    this.additionalOn.push(topic)
  }

  namespaceUse(fn) {
    if (!fn) throw new Error('Parameter fn required.')
    // These directly get passed to socket.io
    this.socketNamespace.use(fn)
  }

  socketUse(fn) {
    if (!fn) throw new Error('Parameter fn required.')
    // These do not get passed to socket.io, as we need to keep
    // middleware order in init()
    this.socketMiddlewareFns.push(fn)
  }

  init() {
    const requesterSocketHandler = (socket) => {
      const { additionalOn, sockend } = this
      debug('incoming connection')
      // Apply all socket middlewares
      this.socketMiddlewareFns.forEach(fn => socket.use(fn))
      // Apply taube handler middleware
      socket.use((packet, next) => {
        const [type, content, cb] = packet
        // All "allowed" topics are not handled
        if (additionalOn.includes(type)) return next() //ignore
        const data = {
          type,
          ...content
        }
        // Apply the requesterTransformers
        sockend.requesterTransformators.forEach((transFn) => transFn(data, socket))

        // Send the package
        this.requester.sendWithOptions(data, {
          useWhitelist: true
        }, (err, res) => {
          // Deal with a taube response
          cb(err, res)
        })
          // Deal with got and other non got errors
          .catch(err => {
            debug(err)
            if (err && err.statusCode && err.statusMessage) {
              return next(new errors[err.statusCode](err.statusMessage))
            }
            next(new errors.InternalServerError('Internal Server Error'))
          })
      })
    }
    // Add all requester handler on connect
    this.socketNamespace.on('connection', requesterSocketHandler)
    return this
  }
}

module.exports = Sockend
