// Needs to be the first thing included in your application
import test from 'ava'

import httpHelper from '../lib/http.js'
import taube from '../lib/index.js'

const { server } = httpHelper

test.before(async() => {
  await taube.http.init()
})

test.serial('should be able to use readiness check with observability', (t) => {
  t.notThrows(() => taube.monitoring.readinessCheck())

  // Does not show ready when server is not running
  server.close()
  t.throws(() => taube.monitoring.readinessCheck(), { message: 'Server not running' })
})
