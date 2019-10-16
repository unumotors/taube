/* eslint-disable global-require */
process.env.COTE_HTTP_DEBUG = true
process.env.COTE_HTTP_ENABLED = true

const coteHttp = require('../')

const test = require('ava')

test('cote-http uses http when http is enabled', async(t) => {
  const responder = new coteHttp.Responder({ key: 'localhost' })
  const response = { type: 'testHttp2', asd: 123 }

  responder.on('testHttp2', async(req) => await req)
  const requester = new coteHttp.Requester({
    key: 'localhost',
    uri: 'http://localhost'
  })
  const res = await requester.send(response)
  response.usedHttp = true
  t.deepEqual(res, response)

  t.throws(
    () => {
    // eslint-disable-next-line no-new
      new coteHttp.Requester({
        key: 'localhost'
      })
    }, 'Invalid configuration. When http is enabled you need to provide a "uri" in the options',
    'When http is enabled requesters require a uri'
  )
})
