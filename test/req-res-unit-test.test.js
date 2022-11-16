/* eslint-disable require-await */
/* eslint-disable global-require */
import test from 'ava'

import express from 'express'
import http from 'http'
import ioServer from 'socket.io'
import taube from '../lib/index.js'

test.before(async() => {
  await taube.http.init()
})

test('can easily mock responders in a unit test', async(t) => {
  // The "example app"
  const requester = new taube.Requester({
    key: 'test-app',
  })

  async function testFn() {
    return await requester.send({ type: 'test-app-unit-test' })
  }

  const expected = 'expected'
  const responder = new taube.Responder({
    key: 'test-app',
  })

  responder.on('test-app-unit-test', async() => expected)
  const res = await testFn()
  t.deepEqual(res, expected)
})

test('sockend can be initialized in testing mode', async(t) => {
  const responderKey = 'sockend test responder 1'
  const type1 = 'sockend test return nothing'

  const response = { response: 'sockend test 1' }
  const namespace = 'test-namespace'

  const responder = new taube.Responder({
    key: responderKey,
    sockendWhitelist: [type1],
  })
  responder.on(type1, async() => await response)

  const app = express()
  const server = http.createServer(app)
  const port = 5999
  const io = ioServer(server)

  // Wait for server to start
  await new Promise((resolve) => {
    server.listen(port, () => {
      resolve()
    })
  })

  // Initialize sockend
  const sockend = new taube.Sockend(io)
  await t.notThrowsAsync(sockend.addNamespace({
    namespace,
    requester: {
      uri: 'http://localhost',
      key: responderKey,
    },
  }))

  server.close()
})
