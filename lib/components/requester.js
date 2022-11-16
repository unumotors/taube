/* eslint-disable no-underscore-dangle */
import got from 'got'

import { deserializeError } from 'serialize-error'
import crypto from 'crypto'
import debugFactory from 'debug'
import fs from 'node:fs'
import defaultConfig from '../config/index.js'
import httpHelper from '../http.js'
import { escape } from '../helpers/converter.js'

const pkg = JSON.parse(fs.readFileSync('package.json'))

const { getPort } = httpHelper

const debug = debugFactory('taube-req')

/**
 * @deprecated
 */
class Requester {
  constructor(options, /* for tests */ configOverwrites = {}) {
    this.config = { ...defaultConfig, ...configOverwrites }
    this.key = options.key || 'default'
    this.port = options.port || this.config.http.port
    this.uri = options.uri

    if (this.config.testing && !this.uri) this.uri = 'http://localhost'

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
    const key = escape(this.key)
    const type = escape(payload.type)
    let httpRes

    try {
      debug('using http')
      const port = this.config.testing && !this.port ? getPort() : this.port
      const headers = {
        'content-type': 'application/json',
        'user-agent': this.userAgent,
      }
      if (options.useWhitelist != undefined) {
        headers['x-use-whitelist'] = options.useWhitelist
      }
      httpRes = await got(`${this.uri}:${port}/${key}/${type}`, {
        method: 'POST',
        headers,
        retry: {
          limit: this.config.got.retries,
          methods: ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
        },
        body: JSON.stringify(payload),
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

export default Requester
