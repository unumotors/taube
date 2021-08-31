const test = require('ava')
const proxyquire = require('proxyquire')

const amqp = proxyquire('../lib/amqp', {
  './config': { amqp: {} }
})

test.serial('taube.amqp.init() does fail if not configured correctly', async t => {
  await t.throwsAsync(
    async() => await amqp.init(),
    { message: 'AMQP host URI needs to be defined either using init(uri) or TAUBE_AMQP_URI' }
  )
})
