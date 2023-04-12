/* eslint-disable no-underscore-dangle */
import { serializeError } from 'serialize-error'

import crypto from 'crypto'
import debugFactory from 'debug'
import httpHelper from '../http.js'
import { escape } from '../helpers/converter.js'
import Errors from './errors.js'

const { app } = httpHelper
const debug = debugFactory('taube-res')

/**
 * @deprecated
 */
class Responder {
  constructor(options) {
    this.key = options.key || 'default'
    if (!options.name) options.name = `Responder ${crypto.randomBytes(3).toString('hex')}`
    this.sockendWhitelist = options.sockendWhitelist || []
  }

  on(type, fn) {
    debug('did setup responder', type)
    // Validate expected inputs
    if (!type || typeof type != 'string') throw new Error('Invalid first parameter, needs to be a string')
    if (!fn || typeof fn != 'function') throw new Error('Invalid second parameter, needs to be function')

    // Setup express endpoint
    type = escape(type)
    const key = escape(this.key)

    // Endpoint to return data at
    app.post(`/${key}/${type}`, (request, response) => {
      debug('recieved req', request.body)
      let sent = false

      function send(res) {
        if (sent) return // Make sure always only called once
        res = JSON.stringify(res)
        response.send(res)
        sent = true
      }

      function prepareError(err) {
        err._isError = true
      }

      function callback(err, res) {
        if (!err) return send(res)
        prepareError(err)
        send(serializeError(err, { useToJSON: false }))
      }

      if (request.headers['x-use-whitelist'] && !this.sockendWhitelist.includes(request.body.type)) {
        const err = new Errors.Forbidden('This endpoint is not public')
        prepareError(err)
        return send(serializeError(err, { useToJSON: false }))
      }

      const rv = fn(request.body, callback)
      if (rv && typeof rv.then == 'function') {
        rv.then(((res) => send(res)))
          .catch((err) => {
            prepareError(err)
            return send(serializeError(err, { useToJSON: false }))
          })
      }
    })
  }
}

export default Responder
