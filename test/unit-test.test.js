/* eslint-disable require-await */
/* eslint-disable global-require */
const test = require('ava')

process.env.TAUBE_HTTP_ENABLED = true
const taube = require('../lib')

test('can easily mock responders in a unit test', async(t) => {
  // The "example app"
  const requester = new taube.Requester({
    key: 'test-app',
    uri: 'http://nothing-here'
  })

  async function test() {
    return await requester.send({ type: 'test-app-unit-test' })
  }


  const expected = 'expected'
  const responder = new taube.Responder({
    key: 'test-app',
    uri: 'http://not-available-in-testing'
  })

  responder.on('test-app-unit-test', async() => expected)
  const res = await test()
  t.deepEqual(res, expected)
})
