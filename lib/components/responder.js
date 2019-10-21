/* eslint-disable no-underscore-dangle */
const serializeError = require('serialize-error')
const crypto = require('crypto')
const upstreamCote = require('@cloud/cote')
const debug = require('debug')('cote-http-res')
const app = require('../app')
const converter = require('../helpers/converter')

let responders = {}

class Responder {
  constructor(options, discoveryOptions = {}) {
    this.key = options.key || 'default'
    if (!options.name) options.name = `Responder ${crypto.randomBytes(3).toString('hex')}`
    if (!responders[this.key]) {
      responders[this.key] = new upstreamCote.Responder(options, { log: false, ...discoveryOptions })
      this.cote = responders[this.key]
    }
  }

  on(type, fn) {
    debug('did setup responder', type)
    // Validate expected inputs
    if (!type || typeof type != 'string') throw new Error('Invalid first parameter, needs to be a string')
    if (!fn || typeof fn != 'function') throw new Error('Invalid second parameter, needs to be function')
    // Setup this also - UNESCAPED - in cote
    responders[this.key].on(type, fn)
    // Setup express endpoint
    type = converter.escape(type)
    const key = converter.escape(this.key)
    app.post(`/${key}/${type}`, (request, response) => {
      debug('recieved req', request.body)
      function callback(err, res) {
        if (!err) return send(res)
        err._isError = true
        send(serializeError(err))
      }

      let sent = false
      function send(res) {
        if (sent) return // Make sure always only called once
        res = JSON.stringify(res)
        response.send(res)
        sent = true
      }

      const rv = fn(request.body, callback)

      if (rv && typeof rv.then == 'function') {
        rv.then((res => send(res)))
          .catch(err => {
            err._isError = true
            return send(serializeError(err))
          })
      }
    })
  }
}

module.exports = Responder
