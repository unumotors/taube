/* eslint-disable no-underscore-dangle */
const got = require('got')
const deserializeError = require('deserialize-error')
const serializeError = require('serialize-error')
const crypto = require('crypto')
const upstreamCote = require('@cloud/cote')
const debug = require('debug')('cote-http-req')
const config = require('../config')

const converter = require('../helpers/converter')

class Requester {
  constructor(options, discoveryOptions = {}) {
    this.key = options.key || 'default'
    this.uri = options.uri
    this.port = options.port || config.http.port
    if (this.uri) {
      if (!this.uri.includes('http://') && !this.uri.includes('https://')) {
        throw new Error('Invalid uri format. Needs to be prefixed by https:// or http://')
      }
    }
    if (!options.name) options.name = `Requester ${crypto.randomBytes(3).toString('hex')}`
    this.cote = new upstreamCote.Requester(options, { log: false, ...discoveryOptions })
  }

  async send(payload, callback) {
    debug('sending', payload)
    const key = converter.escape(this.key)
    const type = converter.escape(payload.type)
    let httpRes

    // If uri is not set use normal cote
    if (!this.uri) {
      debug('using cote')
      // Sending the UNESCAPED request
      if (callback) return this.cote.send(payload, callback)
      return this.cote.send(payload)
    }

    // Try to communicate over http
    try {
      debug('using http')
      httpRes = await got(`${this.uri}:${this.port}/${key}/${type}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
    } catch (error) {
      debug(error)
      // Remove circular json as cote cant handle them when thrown into cote
      const cleanError = deserializeError(serializeError(error))
      throw cleanError
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
