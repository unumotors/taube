/* eslint-disable max-classes-per-file */
import { STATUS_CODES } from 'node:http'

const statusCodes = {}

Object.keys(STATUS_CODES).forEach((code) => {
  const key = code
  const value = STATUS_CODES[key]
  // Map the error name without whitespace to the integer http status code
  statusCodes[value.replace(/\s+/g, '')] = parseInt(code, 10)
})

export class TaubeError extends Error {
  constructor(message, data = undefined) {
    super(message)
    this.data = data
    // Making it possible to detect this error as a TaubeError in other components (e.g. Server)
    this.isTaubeError = true
    this.statusCode = statusCodes[this.constructor.name]
    this.name = this.constructor.name
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

const errorsStrings = {
  'BadRequest': class extends TaubeError {},
  'Continue': class extends TaubeError {},
  'SwitchingProtocols': class extends TaubeError {},
  'Processing': class extends TaubeError {},
  'EarlyHints': class extends TaubeError {},
  'OK': class extends TaubeError {},
  'Created': class extends TaubeError {},
  'Accepted': class extends TaubeError {},
  'Non-AuthoritativeInformation': class extends TaubeError {},
  'NoContent': class extends TaubeError {},
  'ResetContent': class extends TaubeError {},
  'PartialContent': class extends TaubeError {},
  'Multi-Status': class extends TaubeError {},
  'AlreadyReported': class extends TaubeError {},
  'IMUsed': class extends TaubeError {},
  'MultipleChoices': class extends TaubeError {},
  'MovedPermanently': class extends TaubeError {},
  'Found': class extends TaubeError {},
  'SeeOther': class extends TaubeError {},
  'NotModified': class extends TaubeError {},
  'UseProxy': class extends TaubeError {},
  'TemporaryRedirect': class extends TaubeError {},
  'PermanentRedirect': class extends TaubeError {},
  'Unauthorized': class extends TaubeError {},
  'PaymentRequired': class extends TaubeError {},
  'Forbidden': class extends TaubeError {},
  'NotFound': class extends TaubeError {},
  'MethodNotAllowed': class extends TaubeError {},
  'NotAcceptable': class extends TaubeError {},
  'ProxyAuthenticationRequired': class extends TaubeError {},
  'RequestTimeout': class extends TaubeError {},
  'Conflict': class extends TaubeError {},
  'Gone': class extends TaubeError {},
  'LengthRequired': class extends TaubeError {},
  'PreconditionFailed': class extends TaubeError {},
  'PayloadTooLarge': class extends TaubeError {},
  'URITooLong': class extends TaubeError {},
  'UnsupportedMediaType': class extends TaubeError {},
  'RangeNotSatisfiable': class extends TaubeError {},
  'ExpectationFailed': class extends TaubeError {},
  "I'maTeapot": class extends TaubeError {},
  'MisdirectedRequest': class extends TaubeError {},
  'UnprocessableEntity': class extends TaubeError {},
  'Locked': class extends TaubeError {},
  'FailedDependency': class extends TaubeError {},
  'TooEarly': class extends TaubeError {},
  'UpgradeRequired': class extends TaubeError {},
  'PreconditionRequired': class extends TaubeError {},
  'TooManyRequests': class extends TaubeError {},
  'RequestHeaderFieldsTooLarge': class extends TaubeError {},
  'UnavailableForLegalReasons': class extends TaubeError {},
  'InternalServerError': class extends TaubeError {},
  'NotImplemented': class extends TaubeError {},
  'BadGateway': class extends TaubeError {},
  'ServiceUnavailable': class extends TaubeError {},
  'GatewayTimeout': class extends TaubeError {},
  'HTTPVersionNotSupported': class extends TaubeError {},
  'VariantAlsoNegotiates': class extends TaubeError {},
  'InsufficientStorage': class extends TaubeError {},
  'LoopDetected': class extends TaubeError {},
  'BandwidthLimitExceeded': class extends TaubeError {},
  'NotExtended': class extends TaubeError {},
  'NetworkAuthenticationRequired': class extends TaubeError {},
}
const errorsByStatusCodes = {
  '400': errorsStrings.BadRequest,
  '401': errorsStrings.Unauthorized,
  '402': errorsStrings.PaymentRequired,
  '403': errorsStrings.Forbidden,
  '404': errorsStrings.NotFound,
  '405': errorsStrings.MethodNotAllowed,
  '406': errorsStrings.NotAcceptable,
  '407': errorsStrings.ProxyAuthenticationRequired,
  '408': errorsStrings.RequestTimeout,
  '409': errorsStrings.Conflict,
  '410': errorsStrings.Gone,
  '411': errorsStrings.LengthRequired,
  '412': errorsStrings.PreconditionFailed,
  '413': errorsStrings.PayloadTooLarge,
  '414': errorsStrings.URITooLong,
  '415': errorsStrings.UnsupportedMediaType,
  '416': errorsStrings.RangeNotSatisfiable,
  '417': errorsStrings.ExpectationFailed,
  '421': errorsStrings.MisdirectedRequest,
  '422': errorsStrings.UnprocessableEntity,
  '423': errorsStrings.Locked,
  '424': errorsStrings.FailedDependency,
  '425': errorsStrings.TooEarly,
  '426': errorsStrings.UpgradeRequired,
  '428': errorsStrings.PreconditionRequired,
  '429': errorsStrings.TooManyRequests,
  '431': errorsStrings.RequestHeaderFieldsTooLarge,
  '451': errorsStrings.UnavailableForLegalReasons,
  '500': errorsStrings.InternalServerError,
  '501': errorsStrings.NotImplemented,
  '502': errorsStrings.BadGateway,
  '503': errorsStrings.ServiceUnavailable,
  '504': errorsStrings.GatewayTimeout,
  '505': errorsStrings.HTTPVersionNotSupported,
  '506': errorsStrings.VariantAlsoNegotiates,
  '507': errorsStrings.InsufficientStorage,
  '508': errorsStrings.LoopDetected,
  '509': errorsStrings.BandwidthLimitExceeded,
  '510': errorsStrings.NotExtended,
  '511': errorsStrings.NetworkAuthenticationRequired,
}

const errors = {
  ...errorsStrings,
  ...errorsByStatusCodes,
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
export const convertToTaubeError = (error) => {
  // Detect celebrate errors (joy)
  // Ref: https://github.com/arb/celebrate/blob/master/lib/celebrate.js#L180
  if (error.response?.body?.statusCode == 400
    && error.response?.body?.validation) {
    return new errors.BadRequest(error.message, error.response.body.validation)
  }
  // Wrap known taube errors in taube error
  if (error.response?.body?.statusCode
    && errors[error.response.body.statusCode]) {
    return new errors[error.response.body.statusCode](error.response.body.message)
  }

  // Wrap known gotjs HTTP errors in taube error
  // see https://github.com/sindresorhus/got/blob/29ffb44f6be951e1103bb076dadf2b0e5cbd62f1/source/errors.js#L75
  if (error.response?.statusCode
    && errors[error.response.statusCode]) {
    return new errors[error.response.statusCode](error.message, error.response.body)
  }

  // Otherwise we can't deal with this
  return error
}

// exports all populated constructors
export default errors
