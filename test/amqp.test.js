const test = require('ava')
const consts = require('./helper/consts')

process.env.TAUBE_UNIT_TESTS = true

test.serial('throws if amqp cannot connect', async(t) => {
  // eslint-disable-next-line global-require
  const taube = require('../lib')
  const err = await t.throwsAsync(() => taube.amqp.init({
    uri: 'amqp://invalid-uri',
    timeout: 1,
  }))
  console.log(err)
  // This test needs to pass for both node version
  t.true(err.code == 'EAI_AGAIN' // Node 16+
    || err.code == 'ENOTFOUND') // Node 14
})

test.serial('channel error handling works as expected', async(t) => {
  // eslint-disable-next-line global-require
  const taube = require('../lib')
  await taube.amqp.init({ uri: consts.TEST_AMQP_URI })
  const key = 'test-key-error-handling'
  const subscriber = new taube.Subscriber({ key })
  await subscriber.on('test-error-handling', () => {})
  const { channel } = subscriber
  t.throws(() => channel.emit('error', new Error('test2')), { message: 'test2' })
  t.throws(() => channel.emit('close', new Error('test2')), { message: 'test2' })
  t.throws(() => channel.emit('error'), { message: 'amqp issue: connection issue' })
  t.throws(() => channel.emit('close'), { message: 'amqp issue: connection issue' })
  await taube.shutdown()
})

test.serial('taube closes all amqp channels when shutdown is called', async(t) => {
  // eslint-disable-next-line global-require
  const taube = require('../lib')
  await taube.amqp.init({ uri: consts.TEST_AMQP_URI })
  const subscriber = new taube.Subscriber({ key: 'shutdown test' })
  await subscriber.on('a', () => {})
  t.is(taube.amqp.getChannels().length, 1)
  await taube.shutdown()
  t.is(taube.amqp.getChannels().length, 0)
})

test.serial('taube can handle already closed channels gracefully', async(t) => {
  // eslint-disable-next-line global-require
  const taube = require('../lib')
  await taube.amqp.init({ uri: consts.TEST_AMQP_URI })
  const channel = await taube.amqp.channel()
  // eslint-disable-next-line no-underscore-dangle
  channel._channel.close()
  await t.notThrowsAsync(async() => {
    await taube.amqp.shutdownChannel(channel)
  })
})
