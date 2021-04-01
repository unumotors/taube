/* eslint-disable no-bitwise */
/* eslint-disable require-await */
/* eslint-disable global-require */
const test = require('ava')
const Joi = require('joi')
const md5 = require('md5')
const got = require('got')

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_RETRIES = 0 // to get 100% code coverage
process.env.TAUBE_UNIT_TESTS = true

const taube = require('../lib')

let port

test.before(async() => {
  await taube.http.listen() // this makes unit test cover 100%
  port = taube.http.getPort()
})

test.beforeEach(t => {
  t.context = {
    /**
     * Give every test a unique id to use in their URL, so
     * there is no overlap between the routes (where the same route is created multiple times)
     */
    id: md5(t.title)
  }
})

test('GET with params works', async(t) => {
  const { id } = t.context
  const data = { some: 'data' }

  const server = new taube.Server()
  server.get(
    `${id}/:vin`,
    {
      params: Joi.object().keys({
        vin: Joi.string()
      })
    },
    async(req) => {
      t.is(req.params.vin, 'VIN123')
      return data
    }
  )

  const client = new taube.Client({ uri: 'http://localhost', port })
  const response = await client.get(`${id}/VIN123`)
  t.deepEqual(response, data)
})

test('Client.get handles errors', async(t) => {
  const { id } = t.context

  const server = new taube.Server()
  server.get(
    `${id}/:vin`,
    {
      params: Joi.object().keys({
        vin: Joi.string()
      })
    },
    async() => {
      throw new taube.Errors.InternalServerError('internal test error Client.get')
    }
  )

  const client = new taube.Client({ uri: 'http://localhost', port })
  await t.throwsAsync(async() => {
    await client.get(`${id}/VIN123`)
  }, { message: 'internal test error Client.get' })
})

test('POST works with body', async(t) => {
  const { id } = t.context

  const server = new taube.Server({})
  server.post(
    `${id}/scooters/`,
    {
      body: Joi.object().keys({
        vin: Joi.string()
      })
    },
    async(req) => {
      t.is(req.body.vin, 'VIN123')
      return req.body
    }
  )

  const client = new taube.Client({ uri: 'http://localhost', port })
  const response = await client.post(`${id}/scooters/`, { vin: 'VIN123' })
  t.deepEqual(response, { vin: 'VIN123' })
})

test('POST with failing validation returns taube.Errors.BadRequest error', async(t) => {
  const { id } = t.context

  const payload = { } // wrong data

  const server = new taube.Server({})
  server.post(
    `${id}/scooters/`,
    {
      body: Joi.object().keys({
        some: Joi.string().required()
      })
    },
    async(req) => req.body
  )

  const client = new taube.Client({ uri: 'http://localhost', port })

  const error = await t.throwsAsync(async() => {
    await client.post(`${id}/scooters/`, payload)
  }, {
    instanceOf: taube.Errors.BadRequest
  })
  t.is(error.message, 'Response code 400 (Bad Request)')
  t.deepEqual(error.data, {
    body: {
      keys: [
        'some'
      ],
      message: '"some" is required',
      source: 'body'
    }
  })
})

test('POST with nodejs Error returns taube.Errors.InternalServerError error', async(t) => {
  const { id } = t.context

  const payload = { some: 'string ' } // valid date

  const server = new taube.Server({})
  server.post(
    `${id}/scooters/`,
    {
      body: Joi.object().keys({
        some: Joi.string().required()
      })
    },
    () => {
      throw new Error('A random nodejs error')
    }
  )

  const client = new taube.Client({ uri: 'http://localhost', port })

  const error = await t.throwsAsync(async() => {
    await client.post(`${id}/scooters/`, payload)
  }, {
    instanceOf: taube.Errors.InternalServerError
  })
  t.is(error.message, 'A random nodejs error')
})

test('POST with taube Error returns corresponding taube error', async(t) => {
  const { id } = t.context

  const payload = { some: 'string' } // valid data

  const server = new taube.Server({})
  server.post(
    `${id}/scooters/`,
    {
      body: Joi.object().keys({
        some: Joi.string().required()
      })
    },
    () => {
      throw new taube.Errors.NotFound('Something was not found')
    }
  )

  const client = new taube.Client({ uri: 'http://localhost', port })

  const error = await t.throwsAsync(async() => {
    await client.post(`${id}/scooters/`, payload)
  }, {
    instanceOf: taube.Errors.NotFound
  })
  t.is(error.message, 'Something was not found')
})

test('Server.post() with nodejs Error returns Taube InternalServerError taube error', async(t) => {
  const { id } = t.context

  const payload = { some: 'string' } // valid data

  const server = new taube.Server({})
  server.post(
    `${id}/scooters/`,
    {
      body: Joi.object().keys({
        some: Joi.string().required()
      })
    },
    () => {
      throw new Error('some random error')
    }
  )

  const client = new taube.Client({ uri: 'http://localhost', port })

  const error = await t.throwsAsync(async() => {
    await client.post(`${id}/scooters/`, payload)
  }, {
    instanceOf: taube.Errors.InternalServerError
  })
  t.is(error.message, 'some random error')
})

test('POST with gotjs Error returns original error', async(t) => {
  const { id } = t.context

  const client = new taube.Client({ uri: 'http://this-uri-does-not-exist-123123213123' })

  await t.throwsAsync(async() => {
    await client.post(`${id}/scooters/`, {})
  }, {
    instanceOf: got.RequestError
  })
})


test('POST to unknown path returns 404', async(t) => {
  const { id } = t.context

  const client = new taube.Client({ uri: 'http://localhost', port })

  const error = await t.throwsAsync(async() => {
    await client.post(`${id}/scooters/`, { })
  }, {
    instanceOf: taube.Errors.NotFound
  })

  t.is(error.message, 'Response code 404 (Not Found)')
  t.true(error.data.includes('Cannot POST'))
})

test('POST works (with body and validation)', async(t) => {
  const { id } = t.context

  const payload = { some: 'data' }

  const server = new taube.Server({})
  server.post(
    `${id}/scooters/`,
    {
      body: Joi.object().keys({
        some: Joi.string().required()
      })
    },
    async(req) => req.body
  )

  const client = new taube.Client({ uri: 'http://localhost', port })

  const res = await client.post(`${id}/scooters/`, payload)
  t.deepEqual(res, payload)
})
