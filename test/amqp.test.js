const test = require('ava')
const proxyquire = require('proxyquire')

process.env.TAUBE_AMQP_ENABLED = true

const EventEmitter = require('events')

class MockEmitter extends EventEmitter {
  connect() {}
}

const mockAmqp = new MockEmitter()

const amqp = proxyquire('../lib/amqp', {
  'amqplib': {
    connect() {
      return mockAmqp
    }
  }
})

test.serial('amqp registers default error handler correctly', async t => {
  const conn = await amqp.init({ uri: 'amqp://guest:guest@localhost' })
  t.throws(() => conn.emit('error', new Error('test1')), 'test1')
  t.throws(() => conn.emit('error'), 'amqp issue: connection issue')
  t.throws(() => conn.emit('close', new Error('test2')), 'test2')
  await amqp.shutdown()
})

test.serial('amqp registers passed error handler correctly', async t => {
  t.plan(2)
  const conn = await amqp.init({
    uri: 'amqp://guest:guest@localhost',
    errorHandler() {
      t.pass()
    }
  })
  conn.emit('error')
  conn.emit('close')
  await amqp.shutdown()
})

test.serial('channel error handling works as expected', async t => {
  // eslint-disable-next-line global-require
  const taube = require('../lib')
  await taube.init({ amqp: { uri: 'amqp://guest:guest@localhost' } })
  const key = `test-key-error-handling`
  const subscriber = new taube.Subscriber({ key })
  await subscriber.on(`test-error-handling`, () => {})
  const { channel } = subscriber
  t.throws(() => channel.emit('error', new Error('test2')), 'test2')
  t.throws(() => channel.emit('close', new Error('test2')), 'test2')
  t.throws(() => channel.emit('error'), 'amqp issue: connection issue')
  t.throws(() => channel.emit('close'), 'amqp issue: connection issue')
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
