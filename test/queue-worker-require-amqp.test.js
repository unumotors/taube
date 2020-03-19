/* eslint-disable require-await */
/* eslint-disable global-require */
const test = require('ava')

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test

const taube = require('../lib')

test.serial('queue and worker fail without amqp setup', async t => {
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Queue({ key: 'test-amqp-inti-a' })
  }, { message: 'AMQP needs to be initialized before usage. See taube README.md' })
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Worker({ key: 'test-amqp-inti-b' })
  }, { message: 'AMQP needs to be initialized before usage. See taube README.md' })
})

test.after(async() => {
  await taube.shutdown()
})
