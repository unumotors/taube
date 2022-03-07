// Needs to be the first thing included in your application
const test = require('ava')
const { server } = require('../lib/http')
const taube = require('../lib')

test.before(async() => {
  await taube.http.init()
})

test.serial('should be able to use readiness check with observability', (t) => {
  t.notThrows(() => taube.monitoring.readinessCheck())

  // Does not show ready when server is not running
  server.close()
  t.throws(() => taube.monitoring.readinessCheck(), { message: 'Server not running' })
})
