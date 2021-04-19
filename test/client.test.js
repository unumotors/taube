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

