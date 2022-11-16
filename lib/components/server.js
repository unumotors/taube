/* eslint-disable no-underscore-dangle */
import { Router } from 'express'

import { celebrate } from 'celebrate'
import Joi from 'joi'
import httpHelper from '../http.js'
import uriHelper from '../helpers/uri.js'
import Errors from './errors.js'
import Schemas from '../helpers/schema.js'

const { paginationResponseSchema, paginationRequestOptionsSchema } = Schemas

const { app, ensureErrorHandlingMiddlewareIsLast } = httpHelper

function checkParameters(path, validation, fn) {
  if (!path || typeof path != 'string') { throw new Error('Invalid first parameter, needs to be a string') }
  if (!validation || typeof validation != 'object') {
    throw new Error('Invalid second parameter, needs to be a Joi validation . Function needs to be third argument.')
  }
  if (!fn || typeof fn != 'function') throw new Error('Invalid third parameter, needs to be function')
}

async function executeAndReturnResult(req, res, fn) {
  let response
  try {
    response = await fn(req)
  } catch (originalError) {
    response = originalError.isTaubeError
      ? originalError
      : new Errors.InternalServerError(originalError.message, originalError)
    res.status(originalError.statusCode || 500)
  }
  res.json(response)
}

class Server {
  constructor() {
    this.router = new Router()
    app.use(this.router)
  }

  get(path, validate, fn) {
    checkParameters(path, validate, fn)
    this.router.get(uriHelper.validatePath(path), celebrate(validate), async(req, res) => {
      await executeAndReturnResult(req, res, fn)
    })
    ensureErrorHandlingMiddlewareIsLast()
  }

  paginate(path, validate, fn) {
    checkParameters(path, validate, fn)
    validate.query = validate.query || Joi.object()
    validate.query = validate.query.keys({
      ...paginationRequestOptionsSchema,
    })
    this.router.get(uriHelper.validatePath(path), celebrate(validate), async(req, res) => {
      let response
      try {
        response = await fn(req)
        const validation = paginationResponseSchema.validate(response)
        if (validation.error) throw new Errors.InternalServerError(`Server-side pagination error: ${validation.error}`)
      } catch (originalError) {
        response = originalError.isTaubeError
          ? originalError
          : new Errors.InternalServerError(originalError.message, originalError)
        res.status(originalError.statusCode || 500)
      }
      res.json(response)
    })
    ensureErrorHandlingMiddlewareIsLast()
  }

  post(path, validate, fn) {
    checkParameters(path, validate, fn)
    this.router.post(uriHelper.validatePath(path), celebrate(validate), async(req, res) => {
      await executeAndReturnResult(req, res, fn)
    })
    ensureErrorHandlingMiddlewareIsLast()
  }

  put(path, validate, fn) {
    checkParameters(path, validate, fn)
    this.router.put(uriHelper.validatePath(path), celebrate(validate), async(req, res) => {
      await executeAndReturnResult(req, res, fn)
    })
    ensureErrorHandlingMiddlewareIsLast()
  }

  delete(path, validate, fn) {
    checkParameters(path, validate, fn)
    this.router.delete(uriHelper.validatePath(path), celebrate(validate), async(req, res) => {
      await executeAndReturnResult(req, res, fn)
    })
    ensureErrorHandlingMiddlewareIsLast()
  }
}

Server.checkParameters = checkParameters // monkey patching for unit tests

export default Server
