const test = require('ava')

const taube = require('../lib')

test('Client component fails if required parameters are not passed', async(t) => {
  await t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Client({})
  }, { message: 'Missing required "uri" parameter in Requester initialization.' })
})

test('Client component throws an error if path does not start with "/"', async(t) => {
  const client = new taube.Client({ uri: 'http://localhost', port: 8080 })
  await t.throwsAsync(async() => {
    await client.put('scooters', {})
  }, { message: 'This path: "scooters" is invalid. Path must start with "/"' })
})

test('Client makePath can add extra params to path', (t) => {
  const client = new taube.Client({ uri: 'http://localhost', port: 8080 })

  const expectedPath = 'http://localhost:8080/scooters?page=1&limit=20'
  const path = client.makePath('/scooters', { page: 1, limit: 20 })

  t.is(path, expectedPath)
})

test('Client makePath can add extra params to path if it already has other params', (t) => {
  const client = new taube.Client({ uri: 'http://localhost', port: 8080 })

  const expectedPath = 'http://localhost:8080/scooters?q=123&page=1&limit=20'
  const path = client.makePath('/scooters?q=123', { page: 1, limit: 20 })

  t.is(path, expectedPath)
})
