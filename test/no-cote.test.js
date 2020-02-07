/* eslint-disable require-await */
/* eslint-disable global-require */
const test = require('ava')

process.env.TAUBE_HTTP_ENABLED = true
process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_COTE_DISABLED = 'true'
const taube = require('../lib')


test('cote is not available if disabled', async(t) => {
  const responder = new taube.Responder({ key: 'localhost 1' })
  responder.on('test & tester', async() => {})
  t.falsy(responder.cote)

  const requester = new taube.Requester({
    key: 'localhost &',
    uri: 'http://localhost'
  })
  t.falsy(requester.cote)
})

test('cote can be manually enabled', async(t) => {
  const responder = new taube.Responder({ key: 'localhost 2', coteEnabled: true })
  responder.on('test & tester', async() => {})
  t.is(responder.cote.advertisement.key, '$$localhost 2')

  const requester = new taube.Requester({
    key: 'localhost 3',
    uri: 'http://localhost',
    coteEnabled: true
  })
  t.is(requester.cote.discovery.advertisement.key, '$$localhost 3')
})
