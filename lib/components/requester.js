/* eslint-disable no-underscore-dangle */
const got = require('got')
const deserializeError = require('deserialize-error')
const serializeError = require('serialize-error')
const crypto = require('crypto')
const upstreamCote = require('@cloud/cote')
const debug = require('debug')('taube-req')
const config = require('../config')
const { getPort } = require('../http')
const pkg = require('../../package.json')

const converter = require('../helpers/converter')

class Requester {
  constructor(options, discoveryOptions = {}) {
    this.key = options.key || 'default'
    this.port = options.port || config.http.port
    this.uri = options.uri
    this.http = config.http.enabled && this.uri
    if (config.testing) this.uri = 'http://localhost'

    if (config.http.enabled && !this.uri) {
      debug(`Not using http for Requester "${this.key}" as no "uri" has been passed.`)
    }

    if (this.uri && !this.uri.includes('http://') && !this.uri.includes('https://')) {
      throw new Error('Invalid uri format. Needs to be prefixed by https:// or http://')
    }

    if (!options.name) options.name = `Requester ${crypto.randomBytes(3).toString('hex')}`
    this.cote = new upstreamCote.Requester(options, { log: false, ...discoveryOptions })

    const component = options.userAgentComponent || 'Requester'
    this.userAgent = `${pkg.name}@${pkg.version} ${component}`
  }

  async sendWithOptions(payload, options, callback) {
    debug('sending', payload)
    const key = converter.escape(this.key)
    const type = converter.escape(payload.type)
    let httpRes

    // If uri is not set use normal cote
    if (!this.http) {
      debug('using cote')
      // Sending the UNESCAPED request
      if (callback) return this.cote.send(payload, callback)
      return this.cote.send(payload)
    }

    // Try to communicate over http
    try {
      debug('using http')
      const port = config.testing ? getPort() : this.port
      const headers = {
        'content-type': 'application/json',
        'user-agent': this.userAgent
      }
      if (options.useWhitelist != undefined) {
        headers['x-use-whitelist'] = options.useWhitelist
      }
      httpRes = await got(`${this.uri}:${port}/${key}/${type}`, {
        method: 'POST',
        headers,
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
      if (config.debug && typeof res === 'object' && res !== null) {
        res.usedHttp = true
      }
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

  async send(payload, callback) {
    return await this.sendWithOptions(payload, {}, callback)
  }
}

module.exports = Requester
