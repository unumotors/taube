const test = require('ava')

test.serial('channel error handling works as expected', async t => {
  // eslint-disable-next-line global-require
  const taube = require('../lib')
  await taube.init({ amqp: { uri: 'amqp://guest:guest@localhost' } })
  const key = `test-key-error-handling`
  const subscriber = new taube.Subscriber({ key })
  await subscriber.on(`test-error-handling`, () => {})
  const { channel } = subscriber
  t.throws(() => channel.emit('error', new Error('test2')), { message: 'test2' })
  t.throws(() => channel.emit('close', new Error('test2')), { message: 'test2' })
  t.throws(() => channel.emit('error'), { message: 'amqp issue: connection issue' })
  t.throws(() => channel.emit('close'), { message: 'amqp issue: connection issue' })
  await taube.shutdown()
})

test.serial('taube closes all amqp channels when shutdown is called', async t => {
  // eslint-disable-next-line global-require
  const taube = require('../lib')
  await taube.init({ amqp: { uri: 'amqp://guest:guest@localhost' } })
  const subscriber = new taube.Subscriber({ key: 'shutdown test' })
  await subscriber.on('a', () => {})
  t.is(taube.amqp.getChannels().length, 1)
  await taube.shutdown()
  t.is(taube.amqp.getChannels().length, 0)
})
