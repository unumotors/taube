// Needs to be the first thing included in your application
const { server } = require('../lib/app')
const test = require('ava')
const taube = require('../lib')

test.serial('should be able to use readiness check with observability', t => {
  t.notThrows(() => taube.monitoring.readinessCheck())

  // Does not show ready when server is not running
  server.close()
  t.throws(() => taube.monitoring.readinessCheck(), 'Server not running')
})
