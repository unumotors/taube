/* eslint-disable no-bitwise */
/* eslint-disable require-await */
/* eslint-disable global-require */
const test = require('ava')
const Joi = require('joi')
const md5 = require('md5')

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_RETRIES = 0 // to get 100% code coverage
process.env.TAUBE_UNIT_TESTS = true

const taube = require('../lib')

let port

test.before(async() => {
  await taube.http.listen() // this makes unit test cover 100%
  port = taube.http.getPort()
})

test.beforeEach((t) => {
  t.context = {
    /**
     * Give every test a unique id to use in their URL, so
     * there is no overlap between the routes (where the same route is created multiple times)
     */
    id: md5(t.title),
  }
})

test('Client.paginate works with default pagination options', async(t) => {
  const { id } = t.context
  const res = {
    data: [
      {
        vin: 'vin1',
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      totalDocs: 200,
      totalPages: 10,
      hasNextPage: true,
      nextPage: 2,
      hasPrevPage: false,
      prevPage: null,
      pagingCounter: 1,
    },
  }

  const server = new taube.Server()
  server.paginate(
    `/${id}/scooters`,
    {},
    async(req) => {
      t.is(req.query.page, 1)
      t.is(req.query.limit, 20)
      return res
    },
  )

  const client = new taube.Client({ uri: 'http://localhost', port })
  const response = await client.paginate(`/${id}/scooters`)

  t.deepEqual(response, res)
})

test('Client.paginate works with extra validation options', async(t) => {
  const { id } = t.context
  const res = {
    data: [
      {
        vin: 'vin1',
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      totalDocs: 200,
      totalPages: 10,
      hasNextPage: true,
      nextPage: 2,
      hasPrevPage: false,
      prevPage: null,
      pagingCounter: 1,
    },
  }

  const server = new taube.Server()
  server.paginate(
    `/${id}/scooters/:id`,
    {
      query: Joi.object().keys({
        q: Joi.string(),
      }),
      params: Joi.object().keys({
        id: Joi.string(),
      }),
    },
    async(req) => {
      t.is(req.query.page, 2)
      t.is(req.query.limit, 10)
      t.is(req.query.q, 'vin123')
      t.is(req.params.id, '123')
      return res
    },
  )

  const client = new taube.Client({ uri: 'http://localhost', port })
  const response = await client.paginate(`/${id}/scooters/123/?q=vin123`, { page: 2, limit: 10 })

  t.deepEqual(response, res)
})

test('Client.paginate works with custom pagination options', async(t) => {
  const { id } = t.context
  const res = {
    data: [
      {
        vin: 'vin1',
      },
    ],
    pagination: {
      page: 2,
      limit: 20,
      totalDocs: 200,
      totalPages: 10,
      hasNextPage: true,
      nextPage: 2,
      hasPrevPage: false,
      prevPage: 1,
      pagingCounter: 1,
    },
  }

  const server = new taube.Server()
  server.paginate(
    `/${id}/scooters`,
    {},
    async(req) => {
      t.is(req.query.page, 2)
      t.is(req.query.limit, 10)
      return res
    },
  )

  const client = new taube.Client({ uri: 'http://localhost', port })
  const response = await client.paginate(`/${id}/scooters`, { page: 2, limit: 10 })

  t.deepEqual(response, res)
})

test('Client.paginate uses default limit if the key is missing', async(t) => {
  const { id } = t.context
  const res = {
    data: [
      {
        vin: 'vin1',
      },
    ],
    pagination: {
      page: 2,
      limit: 20,
      totalDocs: 200,
      totalPages: 10,
      hasNextPage: true,
      nextPage: 2,
      hasPrevPage: false,
      prevPage: 1,
      pagingCounter: 1,
    },
  }

  const server = new taube.Server()
  server.paginate(
    `/${id}/scooters`,
    {},
    async(req) => {
      t.is(req.query.page, 2)
      t.is(req.query.limit, 20) // uses default limit = 20
      return res
    },
  )

  const client = new taube.Client({ uri: 'http://localhost', port })
  const response = await client.paginate(`/${id}/scooters`, { page: 2 })

  t.deepEqual(response, res)
})

test('Client.paginate handles errors', async(t) => {
  const { id } = t.context

  const server = new taube.Server()
  server.paginate(
    `/${id}/scooters`,
    {},
    async() => {
      throw new taube.Errors.InternalServerError('internal test error Client.paginate')
    },
  )

  const client = new taube.Client({ uri: 'http://localhost', port })
  await t.throwsAsync(async() => {
    await client.paginate(`/${id}/scooters`)
  }, { message: 'internal test error Client.paginate' })
})

test('Server.paginate throws error if the response schema is not valid', async(t) => {
  const { id } = t.context

  const server = new taube.Server()
  server.paginate(
    `/${id}/scooters`,
    {},
    async() => ({
      vin: '123',
    }),
  )

  const client = new taube.Client({ uri: 'http://localhost', port })
  await t.throwsAsync(async() => {
    await client.paginate(`/${id}/scooters`)
  }, { message: 'Server-side pagination error: ValidationError: "vin" is not allowed' })
})

test('Server.paginate() with nodejs Error returns Taube InternalServerError taube error', async(t) => {
  const { id } = t.context

  const server = new taube.Server({})
  server.paginate(
    `/${id}/scooters`,
    {},
    () => {
      throw new Error('some random error')
    },
  )

  const client = new taube.Client({ uri: 'http://localhost', port })

  const error = await t.throwsAsync(async() => {
    await client.paginate(`/${id}/scooters`)
  }, {
    instanceOf: taube.Errors.InternalServerError,
  })
  t.is(error.message, 'some random error')
})
