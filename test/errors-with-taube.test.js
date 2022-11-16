/* eslint-disable require-await */
import test from 'ava' // Overwrite ava to be able to unit test

import taube from '../lib/index.js'

process.env.NODE_ENV = 'development'

const { Errors } = taube

test.before(async() => {
  await taube.http.init()
})

test('should get proper serialized error name, statusCode, message, data, and stack', async(t) => {
  const responder = new taube.Responder({ key: 'localhost-error' })

  const response = { type: 'error-test' }

  const message = 'a should be entered'
  const data = {
    validation: 'a is missing',
  }

  responder.on('error-test', async() => {
    throw new Errors.BadRequest(message, data)
  })

  const requester = new taube.Requester({
    key: 'localhost-error',
    uri: 'http://localhost',
  })

  try {
    await requester.send(response)
    t.fail()
  } catch (error) {
    console.log(error)
    t.is(error.name, 'BadRequest')
    t.is(error.statusCode, 400)
    t.is(error.message, message)
    t.deepEqual(error.data, data)
    t.truthy(error.stack)
  }
})
