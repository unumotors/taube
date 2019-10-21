/* eslint-disable global-require */
process.env.TAUBE_HTTP_DEBUG = true
process.env.TAUBE_HTTP_ENABLED = true

const coteHttp = require('../lib')

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
})
