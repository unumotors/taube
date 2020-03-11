/* eslint-disable require-await */
const test = require('ava')

process.env.TAUBE_HTTP_ENABLED = true
process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_AMQP_ENABLED = true

const taube = require('../lib')

// Every test file (pub-sub*.test.js) needs a different start integer
let globalTestCounter = 500

test.serial('throws if amqp uri has not been defined through either env or passed', async t => {
  await t.throwsAsync(
    () =>
      taube.init(),
    'AMQP host URI needs to be defined either using init(uri) or TAUBE_AMQP_URI'
  )
})

test.serial('amqp can connect with directly passed uri', async t => {
  await t.notThrowsAsync(() => taube.init({ amqp: { uri: 'amqp://guest:guest@localhost' } }))
  await t.notThrowsAsync(
    () => taube.init({ amqp: { uri: 'amqp://guest:guest@localhost' } }),
    'can be called multiple times'
  )
})

test.serial('throws subscribe errors at taube user', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const subscriber = new taube.Subscriber({ key })
  const error = new Error('test error amqp subscribe error')

  subscriber.setupChannel = async() => {
    throw error
  }

  await t.throwsAsync(() => subscriber.on(
    `test-topic-${globalTestCounter}`,
    () => { }
  ), 'test error amqp subscribe error')
})

test.serial('throws publish errors at taube user', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const publisher = new taube.Publisher({ key })
  const error = new Error('test error amqp subscribe error')

  publisher.amqp = {
    channel() {
      throw error
    },
    assertExchange() {}
  }

  await t.throwsAsync(
    () =>
      publisher.publish(`test-topic-${globalTestCounter}`, { data: 1 }),
    'test error amqp subscribe error'
  )

  publisher.amqp = {
    channel() {
      return {
        publish() {
          throw error
        },
        assertExchange() {}
      }
    }
  }

  await t.throwsAsync(
    () =>
      publisher.publish(`test-topic-${globalTestCounter}`, { data: 1 }),
    'test error amqp subscribe error'
  )
})

test.after(async() => {
  await taube.shutdown()
})
