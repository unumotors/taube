/* eslint-disable global-require */
process.env.TAUBE_HTTP_PORT = 3334
process.env.TAUBE_HTTP_ENABLED = true

const test = require('ava')
const coteHttp = require('../lib')
const cote = require('@cloud/cote')

test('req res model cote responders are compatible with cote-http', async(t) => {
  const responder = new coteHttp.Responder({ key: 'localhost', name: 'test responder' })

  const request = { type: 'test23' }
  const response = 'bla'

  responder.on('test23', (res, cb) => {
    cb(null, response)
  })

  const requester = new cote.Requester({
    key: 'localhost',
    name: 'test requester'
  })

  const res1 = await requester.send(request)
  t.is(res1, response)

  const requester2 = new coteHttp.Requester({
    key: 'localhost',
    uri: 'http://localhost',
    name: 'test requester'
  })

  const res2 = await requester2.send(request)
  t.is(response, res2)
})
