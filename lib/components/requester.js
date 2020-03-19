/* eslint-disable no-underscore-dangle */
const got = require('got')
const deserializeError = require('deserialize-error')
const crypto = require('crypto')
const debug = require('debug')('taube-req')
const config = require('../config')
const { getPort } = require('../http')
const pkg = require('../../package.json')

const converter = require('../helpers/converter')

class Requester {
  constructor(options) {
    this.key = options.key || 'default'
    this.port = options.port || config.http.port
    this.uri = options.uri
    if (config.testing) this.uri = 'http://localhost'

    if (!this.uri) {
      throw new Error('Missing required "uri" parameter in Requester initialization.')
    }

    if (!this.uri.includes('http://') && !this.uri.includes('https://')) {
      throw new Error('Invalid uri format. Needs to be prefixed by https:// or http://')
    }

    if (!options.name) options.name = `Requester ${crypto.randomBytes(3).toString('hex')}`

    const component = options.userAgentComponent || 'Requester'
    this.userAgent = `${pkg.name}@${pkg.version} ${component}`
  }

  async sendWithOptions(payload, options, callback) {
    debug('sending', payload)
    const key = converter.escape(this.key)
    const type = converter.escape(payload.type)
    let httpRes

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
        retry: {
          limit: config.got.retries,
          methods: ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE', 'POST']
        },
        body: JSON.stringify(payload)
      })
    } catch (error) {
      debug(error)
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

  async send(payload, callback) {
    return await this.sendWithOptions(payload, {}, callback)
  }
}

module.exports = Requester
