/* eslint-disable require-await */
/* eslint-disable global-require */
const test = require('ava')

process.env.TAUBE_HTTP_ENABLED = true
process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test

const taube = require('../lib')

test.serial('queue and worker fail without amqp setup', async t => {
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Queue({ key: 'test-amqp-inti-a' })
  }, 'Queue requires AMPQ to be enabled and initialized')
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Worker({ key: 'test-amqp-inti-b' })
  }, 'Worker requires AMPQ to be enabled and initialized')
})

test.after(async() => {
  await taube.shutdown()
})
