// Needs to be the first thing included in your application
const { server } = require('../lib/http')
const test = require('ava')
const taube = require('../lib')

test.serial('should be able to use readiness check with observability', async t => {
  if (!server.listening) {
    await new Promise(res => {
      server.on('listening', function() {
        res()
      })
    })
  }
  t.notThrows(() => taube.monitoring.readinessCheck())

  // Does not show ready when server is not running
  server.close()
  t.throws(() => taube.monitoring.readinessCheck(), { message: 'Server not running' })
})
