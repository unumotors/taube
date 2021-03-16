/* eslint-disable require-await */
const test = require('ava')
const { waitUntil } = require('./helper/util')

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_DEBUG = true

process.env.TAUBE_AMQP_URI = 'amqp://guest:guest@localhost'

const taube = require('../lib')

// Every test file (pub-sub*.test.js) needs a different start integer
let globalTestCounter = 200

test.serial('cannot use amqp without intializing amqp first', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Publisher({ key })
  }, { message: 'AMQP needs to be initialized before usage. See taube README.md' })
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Subscriber({ key })
  }, { message: 'AMQP needs to be initialized before usage. See taube README.md' })
})

test.serial('throws if amqp cannot connect', async t => {
  const err = await t.throwsAsync(() => taube.init({
    amqp:
      {
        uri: 'amqp://invalid-uri'
      }
  }))
  // This test needs to pass for both node version
  t.true(err.code == 'EAI_AGAIN' || // Node 14+
    err.code == 'ENOTFOUND') // Node 10
})

test.serial('amqp can connect', async t => {
  await t.notThrowsAsync(() => taube.init())
})

test.serial(' publisher and subscriber require keys', async t => {
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Publisher()
  }, { message: 'Publisher requires "options" property "key" to be set' })
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Publisher({})
  }, { message: 'Publisher requires "options" property "key" to be set' })
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Subscriber()
  }, { message: 'Subscriber requires "options" property "key" to be set' })
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Subscriber({})
  }, { message: 'Subscriber requires "options" property "key" to be set' })
})


test.serial('publisher publish fails with wrong function call', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const publisher = new taube.Publisher({ key })
  await t.throwsAsync(
    () => publisher.publish({}),
    { message: 'First argument to publish must be the topic (a string)' }
  )
})

test.serial('subscriber on fails with wrong function call', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const subscriber = new taube.Subscriber({ key })
  await t.throwsAsync(() => subscriber.on({}), { message: 'First argument to "on" must be the topic (a string)' })
  await t.throwsAsync(() => subscriber.on('', ''), { message: 'Second argument to "on" must be a function' })
})

test.serial('can publish and subscribe one to one', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const data = { test: 1, test2: 2, data: { data: 1 } }
  const publisher = new taube.Publisher({ key })
  const subscriber = new taube.Subscriber({ key })

  let resolve1
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  await subscriber.on(`test-topic-${globalTestCounter}`, (data) => {
    resolve1(data)
  })

  await publisher.publish(`test-topic-${globalTestCounter}`, data)

  const res = await promise1
  t.deepEqual(res, data)
})

test.serial('can publish and subscribe one publisher to two registered functions', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const data = { test: 1, test2: 2, data: { data: 1 } }
  const publisher = new taube.Publisher({ key })
  const subscriber = new taube.Subscriber({ key })

  let resolve1
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  await subscriber.on(`test-topic-${globalTestCounter}`, (data) => {
    resolve1(data)
  })

  let resolve2
  let promise2 = new Promise(async resolve => {
    resolve2 = resolve
  })
  await subscriber.on(`test-topic-${globalTestCounter}`, (data) => {
    resolve2(data)
  })

  await publisher.publish(`test-topic-${globalTestCounter}`, data)

  const [res1, res2] = await Promise.all([promise1, promise2])
  t.deepEqual(res1, data)
  t.deepEqual(res2, data)
})

test.serial('can publish and subscribe one publisher to two seperate subscribers', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const data = { test: 1, test2: 2, data: { data: 1 } }
  const publisher = new taube.Publisher({ key })
  const subscriber1 = new taube.Subscriber({ key })
  const subscriber2 = new taube.Subscriber({ key })

  let resolve1
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  await subscriber1.on(`test-topic-${globalTestCounter}`, (data) => {
    resolve1(data)
  })

  let resolve2
  let promise2 = new Promise(async resolve => {
    resolve2 = resolve
  })
  await subscriber2.on(`test-topic-${globalTestCounter}`, (data) => {
    resolve2(data)
  })

  await publisher.publish(`test-topic-${globalTestCounter}`, data)

  const [res1, res2] = await Promise.all([promise1, promise2])
  t.deepEqual(res1, data)
  t.deepEqual(res2, data)
})


test.serial('can publish and subscribe one publisher to two seperate subscribers with two different topic', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const data = { test: 1, test2: 2, data: { data: 1 } }
  const data2 = { test: 2, test2: 1, data: { data: 2 } }

  const publisher = new taube.Publisher({ key })
  const subscriber1 = new taube.Subscriber({ key })
  const subscriber2 = new taube.Subscriber({ key })

  let resolve1
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  await subscriber1.on(`test-topic-${globalTestCounter}-a`, (data) => {
    resolve1(data)
  })

  let resolve2
  let promise2 = new Promise(async resolve => {
    resolve2 = resolve
  })
  await subscriber2.on(`test-topic-${globalTestCounter}-b`, (data) => {
    resolve2(data)
  })

  await publisher.publish(`test-topic-${globalTestCounter}-a`, data)
  await publisher.publish(`test-topic-${globalTestCounter}-b`, data2)

  const [res1, res2] = await Promise.all([promise1, promise2])
  t.deepEqual(res1, data)
  t.deepEqual(res2, data2)
})


test.serial('can publish and subscribe one publisher to one subscriber with two different topic', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const data = { test: 1, test2: 2, data: { data: 1 } }
  const data2 = { test: 2, test2: 1, data: { data: 2 } }

  const publisher = new taube.Publisher({ key })
  const subscriber1 = new taube.Subscriber({ key })

  let resolve1
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  // This is intentionally not awaited to test if internally
  // the initialization promise can be resolved
  subscriber1.on(`test-topic-${globalTestCounter}-a`, (data) => {
    resolve1(data)
  })

  let resolve2
  let promise2 = new Promise(async resolve => {
    resolve2 = resolve
  })
  await subscriber1.on(`test-topic-${globalTestCounter}-b`, (data) => {
    resolve2(data)
  })

  await publisher.publish(`test-topic-${globalTestCounter}-a`, data)
  await publisher.publish(`test-topic-${globalTestCounter}-b`, data2)

  const [res1, res2] = await Promise.all([promise1, promise2])
  t.deepEqual(res1, data)
  t.deepEqual(res2, data2)
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
  ), { message: 'test error amqp subscribe error' })
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
    assertExchange() {},
    addSetup() {}
  }

  await t.throwsAsync(
    async() =>
      publisher.publish(`test-topic-${globalTestCounter}`, { data: 1 }),
    { message: 'test error amqp subscribe error' }
  )

  publisher.amqp = {
    channel() {
      return {
        publish() {
          throw error
        },
        assertExchange() {},
        addSetup() {}
      }
    }
  }

  await t.throwsAsync(
    async() =>
      publisher.publish(`test-topic-${globalTestCounter}`, { data: 1 }),
    { message: 'test error amqp subscribe error' }
  )
})

test.serial('subscriber does re-setup if queue is deleted', async t => {
  t.plan(5)
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const data1 = { test: 1, data: { data: 1 } }
  const data2 = { test: 2, data: { data: 2 } }
  const publisher = new taube.Publisher({ key })
  const subscriber = new taube.Subscriber({ key })
  let resolve1
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  let count = 0
  let initialConsumerTag
  await subscriber.on(`test-topic-${globalTestCounter}`, (data) => {
    count++
    if (count == 1) {
      t.deepEqual(data, data1)
      t.is(data.test, count)
      initialConsumerTag = subscriber.consumer.consumerTag // initial consumer tag to compare later
    }
    if (count == 2) {
      t.deepEqual(data, data2)
      t.is(data.test, count)
      t.not(
        initialConsumerTag,
        subscriber.consumer.consumerTag,
        `subscriber should have a new consumer tag after re-setup`
      )
      resolve1()
    }
  })
  await publisher.publish(`test-topic-${globalTestCounter}`, data1)

  // This will trigger a re-build of all subscribers
  // eslint-disable-next-line no-underscore-dangle
  await subscriber.channel._channel.deleteQueue(subscriber.q.queue)

  // Wait for the subscriber to re-setup everything
  // Wait until the consumer reconnected (and has a new consumer tag)
  await waitUntil(() => subscriber.consumer && subscriber.consumer.consumerTag != initialConsumerTag)
  await publisher.publish(`test-topic-${globalTestCounter}`, data2)
  await promise1
})


test.serial('underlying library does reconnect', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const data = { test: 1, test2: 2, data: { data: 1 } }
  const publisher = new taube.Publisher({ key })
  const subscriber = new taube.Subscriber({ key })

  let resolve1
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  await subscriber.on(`test-topic-${globalTestCounter}`, (data) => {
    resolve1(data)
  })

  // publish once to lazily connect
  await publisher.publish(`test-topic-${globalTestCounter}`, data)

  const connection = await taube.amqp.connection()
  // Simulate a disconnect like the underlying library does in
  // its tests https://github.com/benbria/node-amqp-connection-manager/blob/master/test/fixtures.js#L121
  const connectionPromise = new Promise(resolve => {
    connection.once('connect', () => resolve())
  })
  // eslint-disable-next-line no-underscore-dangle
  connection._currentConnection.emit('close', {})

  // Publish in disconnected state
  await publisher.publish(`test-topic-${globalTestCounter}`, data)

  await connectionPromise

  const res = await promise1
  t.deepEqual(res, data)
})

test.after(async() => {
  await taube.shutdown()
})
