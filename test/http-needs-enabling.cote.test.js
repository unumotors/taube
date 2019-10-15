/* eslint-disable global-require */
process.env.COTE_HTTP_DEBUG = true
const test = require('ava')
const coteHttp = require('../')

test('cote-http uses normal cote when http is not enabled', async(t) => {

  const responder = new coteHttp.Responder({ key: 'localhost' })
  const response = { type: 'testHttp1', asd: 123 }

  responder.on('testHttp1', async(req) => await req)
  const requester = new coteHttp.Requester({
    key: 'localhost',
    uri: 'http://localhost'
  })
  const res = await requester.send(response)
  t.deepEqual(res, response)
  t.falsy(res.usedHttp)
})
