const { STATUS_CODES } = require('http')

const statusCodes = Object.keys(STATUS_CODES).map((statusCode) => parseInt(statusCode, 10))

function createErrorConstructor(errorName, statusCode) {
  class TaubeError extends Error {
    constructor(message, data) {
      super(message)
      this.name = errorName
      this.statusCode = statusCode
      this.data = data
      // Making it possible to detect this error as a TaubeError in other components (e.g. Server)
      this.isTaubeError = true
    }

    toJSON() {
      return {
        message: this.message,
        name: this.name,
        statusCode: this.statusCode,
        data: this.data,
      }
    }
  }
  Object.defineProperty(TaubeError, 'name', { value: errorName })
  return TaubeError
}

/**
 * Converts known errors to a taube error. Returns original error for unknown errors
 *
 * Known errors:
 * - Joi celebrate validation errors
 * - Any TaubeError
 * - HTTP errors (with error.statusCode and error.body)
 *
 * @param {Error} error Known error
 * @returns TaubeError|Error Either a TaubeError for known errors or the original error for unknown errors
 */
module.exports.convertToTaubeError = (error) => {
  // Detect celebrate errors (joy)
  // Ref: https://github.com/arb/celebrate/blob/master/lib/celebrate.js#L180
  if (error.body
    && error.body.statusCode == 400
    && error.body.validation) {
    return new exports.BadRequest(error.message, error.body.validation)
  }
  // Wrap known taube errors in taube error
  if (error.body
      && error.body.statusCode
      && exports[error.body.statusCode]) {
    return new exports[error.body.statusCode](error.body.message)
  }

  // Wrap known gotjs HTTP errors in taube error
  // see https://github.com/sindresorhus/got/blob/29ffb44f6be951e1103bb076dadf2b0e5cbd62f1/source/errors.js#L75
  if (error.body
    && error.statusCode
    && exports[error.statusCode]) {
    return new exports[error.statusCode](error.message, error.body)
  }

  // Otherwise we can't deal with this
  return error
}

function populateConstructorExports(codes) {
  codes.filter((code) => code >= 400 && code <= 511)
    .forEach((statusCode) => {
      // remove space between string to make class name properly
      // eg., Bad Request->BadRequest
      const errorName = STATUS_CODES[statusCode].replace(/\s+/g, '')
      const error = createErrorConstructor(errorName, statusCode)
      module.exports[errorName] = error
      module.exports[statusCode] = error
    })
}

// exports all populated constructors
populateConstructorExports(statusCodes)
