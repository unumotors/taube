import test from 'ava'
import Errors from '../lib/components/errors.js'

test('should return BadRequest Error\'s name, statusCode, data, message', (t) => {
  const message = 'a should be entered'
  const data = {
    validation: 'a is missing',
  }

  const result = new Errors.BadRequest(message, data)

  const expectedResult = {
    statusCode: 400,
    name: 'BadRequest',
    data,
    message,
  }

  t.is(result instanceof Error, true)
  t.is(result.constructor.name, 'BadRequest')
  t.is(result.name, expectedResult.name)
  t.is(result.statusCode, expectedResult.statusCode)
  t.deepEqual(result.data, expectedResult.data)
  t.is(result.message, expectedResult.message)
  t.truthy(result.stack)
})

test('should return NotFound Error\'s name, statusCode, message', (t) => {
  const message = 'a is not found'
  const result = new Errors.NotFound(message)
  const expectedResult = {
    statusCode: 404,
    name: 'NotFound',
    data: undefined,
    message,
  }
  t.is(result instanceof Error, true)
  t.is(result.constructor.name, 'NotFound')
  t.is(result.statusCode, expectedResult.statusCode)
  t.is(result.name, expectedResult.name)
  t.is(result.data, expectedResult.data)
  t.is(result.message, expectedResult.message)
  t.is(result.validation, undefined)
  t.truthy(result.stack)
})

test('should return InternServerError\'s name, statusCode, message', (t) => {
  const result = new Errors.InternalServerError()

  const expectedResult = {
    statusCode: 500,
    name: 'InternalServerError',
    message: '', // default is empty string
    data: undefined,
  }

  t.is(result instanceof Error, true)
  t.is(result.constructor.name, 'InternalServerError')
  t.is(result.statusCode, expectedResult.statusCode)
  t.is(result.name, expectedResult.name)
  t.is(result.message, expectedResult.message)
  t.is(result.data, undefined)
  t.truthy(result.stack)
})

test('should return NotFound Error when creating error with statusCode', (t) => {
  const message = 'a is not found'
  const result = new Errors[404](message)

  const expectedResult = {
    statusCode: 404,
    name: 'NotFound',
    message,
    data: undefined,
  }

  t.is(result instanceof Error, true)
  t.is(result.constructor.name, 'NotFound')
  t.is(result.statusCode, expectedResult.statusCode)
  t.is(result.name, expectedResult.name)
  t.is(result.data, expectedResult.data)
  t.is(result.validation, undefined)
  t.truthy(result.stack)
})

test('should not return Error when trying to create error object with invalid statusCode', (t) => {
  const message = 'invalid statusCode'
  try {
    const error = new Errors[999](message)
    if (error) t.fail()
  } catch (error) {
    t.is(error instanceof TypeError, true)
  }
})

test('Errors can be serialized to JSON properly', (t) => {
  const message = 'test message'
  const data = { test: 'test' }
  const error = new Errors.InternalServerError(message, data)

  const json = JSON.stringify(error)
  const deserialized = JSON.parse(json)

  t.is(deserialized.name, 'InternalServerError')
  t.is(deserialized.statusCode, 500)
  t.is(deserialized.message, message)
  t.deepEqual(deserialized.data, data)
})
