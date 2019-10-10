/* eslint-disable no-underscore-dangle */
const serializeError = require('serialize-error')
const crypto = require('crypto')
const upstreamCote = require('@cloud/cote')
const debug = require('debug')('cote-http-res')
const app = require('./app')

let responders = {}

class Responder {
  constructor(options, discoveryOptions = {}) {
    this.key = options.key || 'default'
    // Is namespaced Responder which cant be handled yet, fallback to upstream cote
    if (!options.name) options.name = `Responder ${crypto.randomBytes(3).toString('hex')}`
    if (!responders[this.key]) {
      const rsp = new upstreamCote.Responder(options, { log: false, ...discoveryOptions })
      // Return upstream cote if undhandled use case (namespaced and respondsTo for now)
      if (options.namespace || options.respondsTo) return rsp
      responders[this.key] = rsp
    }
  }

  on(name, fn) {
    debug('did setup responder', name)
    // Validate expected inputs
    if (!name || typeof name != 'string') throw new Error('Invalid first parameter, needs to be a string')
    if (!fn || typeof fn != 'function') throw new Error('Invalid second parameter, needs to be function')
    // Setup this also in cote
    responders[this.key].on(name, fn)
    // Setup express endpoint
    name = escape(name)
    app.post(`/${this.key}/${name}`, (request, response) => {
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
