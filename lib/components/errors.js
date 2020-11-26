const { STATUS_CODES } = require('http')

const statusCodes = Object.keys(STATUS_CODES).map(statusCode => parseInt(statusCode, 10))

function createErrorConstructor(errorName, statusCode) {
  class TaubeError extends Error {
    constructor(message, data) {
      super(message)
      this.name = errorName
      this.statusCode = statusCode
      this.data = data
    }
  }
  Object.defineProperty(TaubeError, 'name', { value: errorName })
  return TaubeError
}

function populateConstructorExports(codes) {
  codes.filter(code => code >= 400 && code <= 511)
    .map(statusCode => {
      // remove space between string to make class name properly
      // eg., Bad Request->BadRequest
      const errorName = STATUS_CODES[statusCode].replace(/\s+/g, '')
      const error = createErrorConstructor(errorName, statusCode)
      module.exports[errorName] = error
      module.exports[statusCode] = error
      return module.exports
    })
}

// exports all populated constructors
populateConstructorExports(statusCodes)
