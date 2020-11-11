const test = require('ava')
const serializeError = require('serialize-error')
const Errors = require('../lib/components/errors')

test(`should return BadRequest Error's name, statusCode, data, message, validation`, t => {
  const data = 'a should be entered'
  const validation = 'a is missing'
  const result = new Errors.BadRequest(data, validation)
  t.is(result instanceof Error, true)
  t.is(result.constructor.name, 'BadRequest')

  const expectedResult = {
    statusCode: 400,
    name: 'BadRequest',
    data,
    message: 'Bad Request',
    validation
  }
  const serializedError = serializeError(result)
  t.is(serializedError.statusCode, expectedResult.statusCode)
  t.is(serializedError.name, expectedResult.name)
  t.is(serializedError.data, expectedResult.data)
  t.is(serializedError.message, expectedResult.message)
  t.is(serializedError.validation, expectedResult.validation)
  t.truthy(serializedError.stack)
})

test(`should return NotFound Error's name, statusCode, data, message`, t => {
  const data = 'a is not found'
  const result = new Errors.NotFound(data)
  t.is(result instanceof Error, true)
  t.is(result.constructor.name, 'NotFound')

  const expectedResult = {
    statusCode: 404,
    name: 'NotFound',
    data,
    message: 'Not Found'
  }
  const serializedError = serializeError(result)
  t.is(serializedError.statusCode, expectedResult.statusCode)
  t.is(serializedError.name, expectedResult.name)
  t.is(serializedError.data, expectedResult.data)
  t.is(serializedError.message, expectedResult.message)
  t.is(serializedError.validation, undefined)
  t.truthy(serializedError.stack)
})

test(`should return InternServerError's name, statusCode, message`, t => {
  const result = new Errors.InternalServerError()
  t.is(result instanceof Error, true)
  t.is(result.constructor.name, 'InternalServerError')

  const expectedResult = {
    statusCode: 500,
    name: 'InternalServerError',
    message: 'Internal Server Error'
  }
  const serializedError = serializeError(result)
  t.is(serializedError.statusCode, expectedResult.statusCode)
  t.is(serializedError.name, expectedResult.name)
  t.is(serializedError.message, expectedResult.message)
  t.is(serializedError.data, undefined)
  t.truthy(serializedError.stack)
})

test(`should return NotFound Error when creating error with statusCode`, t => {
  const data = 'a is not found'
  const result = new Errors[404](data)
  t.is(result instanceof Error, true)
  t.is(result.constructor.name, 'NotFound')

  const expectedResult = {
    statusCode: 404,
    name: 'NotFound',
    data
  }
  const serializedError = serializeError(result)
  t.is(serializedError.statusCode, expectedResult.statusCode)
  t.is(serializedError.name, expectedResult.name)
  t.is(serializedError.data, expectedResult.data)
  t.is(serializedError.validation, undefined)
  t.truthy(serializedError.stack)
})

test(`should return BadRequest Error with JSON data`, t => {
  const data = { details: 'a should be entered' }
  const validation = 'a is missing'
  const result = new Errors.BadRequest(data, validation)
  t.is(result instanceof Error, true)
  t.is(result.constructor.name, 'BadRequest')

  const expectedResult = {
    statusCode: 400,
    name: 'BadRequest',
    data,
    message: 'Bad Request',
    validation
  }
  const serializedError = serializeError(result)
  t.is(serializedError.statusCode, expectedResult.statusCode)
  t.is(serializedError.name, expectedResult.name)
  t.deepEqual(serializedError.data, expectedResult.data)
  t.is(serializedError.message, expectedResult.message)
  t.is(serializedError.validation, expectedResult.validation)
  t.truthy(serializedError.stack)
})

test(`should not return Error when trying to create error object with invalid statusCode`, t => {
  const message = 'invalid statusCode'
  try {
    const error = new Errors[999](message)
    if (error) t.fail()
  } catch (error) {
    t.is(error instanceof TypeError, true)
  }
})

test(`should ignore validation field when trying to create NotFound error with validation`, t => {
  const data = { details: 'a is not found' }
  const validation = 'validation is not necessary'
  const result = new Errors.NotFound(data, validation)
  t.is(result instanceof Error, true)
  t.is(result.constructor.name, 'NotFound')

  const expectedResult = {
    statusCode: 404,
    name: 'NotFound',
    data,
    message: 'Not Found'
  }
  const serializedError = serializeError(result)
  t.is(serializedError.statusCode, expectedResult.statusCode)
  t.is(serializedError.name, expectedResult.name)
  t.deepEqual(serializedError.data, expectedResult.data)
  t.is(serializedError.message, expectedResult.message)
  t.is(serializedError.validation, undefined)
  t.truthy(serializedError.stack)
})
