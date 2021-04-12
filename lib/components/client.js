/* eslint-disable no-underscore-dangle */
const got = require('got')

const config = require('../config')
const pkg = require('../../package.json')

const uriHelper = require('../helpers/uri')
const Errors = require('./errors')

const retry = {
  limit: config.got.retries,
  methods: ['GET', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE']
}

const headers = {
  'user-agent': `${pkg.name}@${pkg.version} Client`
}

class Client {
  constructor({ uri, port }) {
    this.uri = uriHelper.fixClientURI(uri)
    this.port = port || config.http.port
    if (!this.uri) {
      throw new Error('Missing required "uri" parameter in Requester initialization.')
    }
  }

  makePath(path) {
    const uri = new URL(path, `${this.uri}`)
    uri.port = this.port
    return uri.href
  }

  async get(path) {
    try {
      const response = await got.get(this.makePath(path), {
        headers,
        retry,
        responseType: 'json',
        json: true
      })
      return response.body
    } catch (error) {
      throw Errors.convertToTaubeError(error)
    }
  }

  async post(path, payload) {
    try {
      const response = await got.post(this.makePath(path), {
        headers,
        retry,
        body: payload,
        responseType: 'json',
        json: true
      })

      return response.body
    } catch (error) {
      throw Errors.convertToTaubeError(error)
    }
  }

  async put(path, payload) {
    try {
      const response = await got.put(this.makePath(path), {
        headers,
        retry,
        body: payload,
        responseType: 'json',
        json: true
      })

      return response.body
    } catch (error) {
      throw Errors.convertToTaubeError(error)
    }
  }

  async delete(path) {
    try {
      const response = await got.delete(this.makePath(path), {
        headers,
        retry,
        responseType: 'json',
        json: true
      })

      return response.body
    } catch (error) {
      throw Errors.convertToTaubeError(error)
    }
  }
}

module.exports = Client
