/* eslint-disable no-underscore-dangle */
const serializeError = require('serialize-error')
const crypto = require('crypto')
const upstreamCote = require('@cloud/cote')
const debug = require('debug')('cote-http-res')
const app = require('./app')

const occupiedOn = {}

let responder

let env = '-'

class Responder {
  constructor(options, discoveryOptions = {}) {
    // Is namespaced Responder which cant be handled yet, fallback to upstream cote
    if (!options.name) options.name = `Responder ${crypto.randomBytes(3).toString('hex')}`
    if (!responder) {
      // Create a new upstream cote responder while preserving passed env
      upstreamCote.Responder.constructor._environment = `${env}:`
      const rsp = new upstreamCote.Responder(options, { log: false, ...discoveryOptions })
      // Return upstream cote if undhandled use case (namespaced and respondsTo for now)
      if (options.namespace || options.respondsTo) return rsp
      responder = rsp
      this.cote = responder
    } else if (responder.advertisement.key.split('$$')[1] != `${options.key}`) {
      throw new Error('One service can only have a single "key". All Responders need to have that key')
    }
  }

  static setEnvironment(environment) {
    if (!environment) return
    env = environment
  }

  on(name, fn) {
    debug('did setup responder', name)
    // Validate expected inputs
    if (!name || typeof name != 'string') throw new Error('Invalid first parameter, needs to be a string')
    if (!fn || typeof fn != 'function') throw new Error('Invalid second parameter, needs to be function')
    // Setup this also in cote
    responder.on(name, fn)
    // This library can't handle Responders targeted at a Sockend
    if (this.upstreamCoteUsage) return
    // Check if this name is occupied already
    if (occupiedOn[name]) throw new Error(`on(${name},fn) is already occupied`)
    occupiedOn[name] = true
    // Setup express endpoint
    name = escape(name)
    app.post(`/${env}/${name}`, (request, response) => {
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
