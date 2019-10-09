/* eslint-disable no-underscore-dangle */
const got = require('got')
const deserializeError = require('deserialize-error')
const crypto = require('crypto')
const upstreamCote = require('@cloud/cote')
const debug = require('debug')('cote-http-req')
const config = require('../config')

let env = '-'

class Requester {
  constructor(options, discoveryOptions = {}) {
    this.key = options.key
    if (!options.name) options.name = `Requester ${crypto.randomBytes(3).toString('hex')}`
    // Create a new upstream cote responder while preserving passed env

    upstreamCote.Requester.constructor._environment = `${env}:`
    this.cote = new upstreamCote.Requester(options, { log: false, ...discoveryOptions })
  }

  static setEnvironment(environment) {
    if (!environment) return
    env = environment
  }

  async send(payload, callback) {
    debug('sending', payload)
    const key = escape(this.key)
    let httpRes
    // Try to communicate over http
    try {
      httpRes = await got(`http://${key}:${config.http.port}/${env}/${payload.type}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
    } catch (error) {
      debug(error)
      // If there are 404s use cote instead
      if (error.statusCode == 404) {
        debug('using cote fallback')
        if (callback) return this.cote.send(payload, callback)
        return this.cote.send(payload)
      }

      throw error
    }

    let res
    // If response contains data, parse it
    if (httpRes.body && httpRes.body != '') {
      res = JSON.parse(httpRes.body)
      // Deserialize error if res != null
      if (res && res._isError) {
        delete res._isError
        res = deserializeError(res)
        if (callback) return callback(res)
        throw res
      }
    }

    // Return answer
    if (callback) return callback(null, res)
    return res
  }
}

module.exports = Requester
