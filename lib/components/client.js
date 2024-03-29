/* eslint-disable no-underscore-dangle */
import got from 'got'

import fs from 'node:fs'
import config from '../config/index.js'
import uriHelper from '../helpers/uri.js'
import { convertToTaubeError } from './errors.js'

const pkg = JSON.parse(fs.readFileSync('package.json'))

const retry = {
  limit: config.got.retries,
  methods: ['GET', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE'],
}

const headers = {
  'user-agent': `${pkg.name}@${pkg.version} Client`,
}

const paginationDefaultOptions = {
  page: 1,
  limit: 20,
}

class Client {
  constructor({ uri, port = config.http.port }) {
    this.uri = uriHelper.fixClientURI(uri)
    this.port = port
    if (!this.uri) {
      throw new Error('Missing required "uri" parameter in Requester initialization.')
    }
  }

  makePath(path, params = {}) {
    uriHelper.validatePath(path)
    const uri = new URL(path, `${this.uri}`)
    for (const param in params) {
      uri.searchParams.append(param, params[param])
    }
    uri.port = this.port
    return uri.href
  }

  /**
   * GET an endpoint
   *
   * @param {string} path URL path. e.g. /items
   * @param {Object} options Options passed directly to got
   * @returns {Promise<any>} The response of the query
   */
  async get(path, options = {}) {
    if (options?.query) {
      options.searchParams = options.query
      delete options.query
    }
    try {
      const response = await got.get(this.makePath(path), {
        headers,
        retry,
        responseType: 'json',
        ...options,
      })
      return response.body
    } catch (error) {
      throw convertToTaubeError(error)
    }
  }

  /**
   * GET an endpoint that returns a paginated list
   *
   * @param {string} path URL path. e.g. /items
   * @param {Object} options Options passed directly to got
   * @returns {Promise<any>} The response of the query
   */
  async paginate(path, options = {}) {
    options = { ...paginationDefaultOptions, ...options }
    try {
      const response = await got.get(this.makePath(path, options), {
        headers,
        retry,
        responseType: 'json',
      })
      return response.body
    } catch (error) {
      throw convertToTaubeError(error)
    }
  }

  /**
   * POST an endpoint
   *
   * @param {string} path URL path. e.g. /items
   * @param {Object} payload The payload to POST
   * @param {Object} options Options passed directly to got
   * @returns {Promise<any>} The response of the query
   */
  async post(path, payload, options = {}) {
    if (options?.query) {
      options.searchParams = options.query
      delete options.query
    }
    try {
      const response = await got.post(this.makePath(path), {
        headers,
        retry,
        json: payload,
        responseType: 'json',
        ...options,
      })

      return response.body
    } catch (error) {
      throw convertToTaubeError(error)
    }
  }

  /**
   * PUT an endpoint
   *
   * @param {string} path URL path. e.g. /items
   * @param {Object} payload The payload to POST
   * @param {Object} options Options passed directly to got
   * @returns {Promise<any>} The response of the query
   */
  async put(path, payload, options = {}) {
    if (options?.query) {
      options.searchParams = options.query
      delete options.query
    }
    try {
      const response = await got.put(this.makePath(path), {
        headers,
        retry,
        json: payload,
        responseType: 'json',
        ...options,
      })

      return response.body
    } catch (error) {
      throw convertToTaubeError(error)
    }
  }

  /**
   * DELETE an endpoint
   *
   * @param {string} path URL path. e.g. /items
   * @param {Object} options Options passed directly to got
   * @returns {Promise<any>} The response of the query
   */
  async delete(path, options = {}) {
    if (options?.query) {
      options.searchParams = options.query
      delete options.query
    }
    try {
      const response = await got.delete(this.makePath(path), {
        headers,
        retry,
        responseType: 'json',
        ...options,
      })

      return response.body
    } catch (error) {
      throw convertToTaubeError(error)
    }
  }
}

export default Client
