/* eslint-disable require-await */
const test = require('ava')

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_UNIT_TESTS = true

const taube = require('../lib')
const consts = require('./helper/consts')

// Every test file (pub-sub*.test.js) needs a different start integer
let globalTestCounter = 500

test.serial('amqp can connect with directly passed uri', async(t) => {
  await t.notThrowsAsync(() => taube.amqp.connection(consts.brokerUri))
  await t.notThrowsAsync(
    () => taube.amqp.connection(consts.brokerUri),
    'can be called multiple times',
  )
})

test.serial('throws subscribe errors at taube user', async(t) => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const subscriber = new taube.Subscriber({ key, brokerUri: consts.brokerUri })
  const error = new Error('test error amqp subscribe error')

  subscriber.setupChannel = async() => {
    throw error
  }

  await t.throwsAsync(() => subscriber.on(
    `test-topic-${globalTestCounter}`,
    () => { },
  ), { message: 'test error amqp subscribe error' })
})

test.serial('throws publish errors at taube user', async(t) => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const publisher = new taube.Publisher({ key, brokerUri: consts.brokerUri })
  const error = new Error('test error amqp subscribe error')

  publisher.amqp = {
    channel() {
      throw error
    },
    assertExchange() {},
    addSetup() {},
  }

  await t.throwsAsync(
    () => publisher.publish(`test-topic-${globalTestCounter}`, { data: 1 }),
    { message: 'test error amqp subscribe error' },
  )

  publisher.amqp = {
    channel() {
      return {
        publish() {
          throw error
        },
        assertExchange() {},
        addSetup() {},
      }
    },
  }

  await t.throwsAsync(
    () => publisher.publish(`test-topic-${globalTestCounter}`, { data: 1 }),
    { message: 'test error amqp subscribe error' },
  )
})

test.after(async() => {
  await taube.shutdown()
})
