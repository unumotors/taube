/* eslint-disable no-underscore-dangle */
const serializeError = require('serialize-error')
const crypto = require('crypto')
const upstreamCote = require('@cloud/cote')
const debug = require('debug')('taube-res')
const { app } = require('../http')
const converter = require('../helpers/converter')
const errors = require('http-errors')
const config = require('../config')

let responders = {}

class Responder {
  constructor(options, discoveryOptions = {}) {
    this.key = options.key || 'default'
    if (!options.name) options.name = `Responder ${crypto.randomBytes(3).toString('hex')}`

    this.coteEnabled = options.coteEnabled != undefined ? options.coteEnabled : config.coteEnabled

    if (this.coteEnabled && !responders[this.key]) {
      responders[this.key] = new upstreamCote.Responder(options, { log: false, ...discoveryOptions })
      this.cote = responders[this.key]
    }
    this.sockendWhitelist = options.sockendWhitelist || []
  }

  on(type, fn) {
    debug('did setup responder', type)
    // Validate expected inputs
    if (!type || typeof type != 'string') throw new Error('Invalid first parameter, needs to be a string')
    if (!fn || typeof fn != 'function') throw new Error('Invalid second parameter, needs to be function')
    // Setup this also - UNESCAPED - in cote
    if (this.coteEnabled) {
      responders[this.key].on(type, fn)
    }
    // Setup express endpoint
    type = converter.escape(type)
    const key = converter.escape(this.key)

    // Endpoint to return data at
    app.post(`/${key}/${type}`, (request, response) => {
      debug('recieved req', request.body)
      function callback(err, res) {
        if (!err) return send(res)
        prepareError(err)
        send(serializeError(err))
      }

      function prepareError(err) {
        err._isError = true
      }

      let sent = false
      function send(res) {
        if (sent) return // Make sure always only called once
        res = JSON.stringify(res)
        response.send(res)
        sent = true
      }

      if (request.headers['x-use-whitelist'] && !this.sockendWhitelist.includes(request.body.type)) {
        const err = errors.Forbidden('This endpoint is not public')
        prepareError(err)
        return send(serializeError(err))
      }

      const rv = fn(request.body, callback)
      if (rv && typeof rv.then == 'function') {
        rv.then((res => send(res)))
          .catch(err => {
            prepareError(err)
            return send(serializeError(err))
          })
      }
    })
  }
}

module.exports = Responder
