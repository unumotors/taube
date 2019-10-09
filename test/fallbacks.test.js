/* eslint-disable global-require */
import r from 'randomstring'

process.env.COTE_HTTP_PORT = 3334

const test = require('ava')

test('req res model requester does fallback to cote on 404', async(t) => {
  const environment = r.generate()

  const coteHttp = require('../src/index')({ environment })
  const cote = require('@cloud/cote')({ environment })
  const responder = new cote.Responder({ key: 'localhost', name: 'test responder' })
  const request = { type: 'test11' }
  const response = 'bla'

  responder.on('test11', async() => await response)

  const requester = new coteHttp.Requester({
    key: 'localhost',
    name: 'test requester'
  })

  const res1 = await requester.send(request)
  t.is(response, res1)
})

test('req res model cote responders are compatible with cote-http', async(t) => {
  const environment = r.generate()

  const coteHttp = require('../src/index')({ environment })
  const cote = require('@cloud/cote')({ environment })

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
})
