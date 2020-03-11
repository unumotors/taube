/* eslint-disable require-await */
const test = require('ava')

process.env.TAUBE_HTTP_ENABLED = true

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_DEBUG = true

process.env.TAUBE_AMQP_URI = 'amqp://guest:guest@localhost'
process.env.TAUBE_AMQP_ENABLED = true

const taube = require('../lib')

// Every test file (pub-sub*.test.js) needs a different start integer
let globalTestCounter = 200

test.serial('cannot use amqp without intializing amqp first', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Publisher({ key })
  }, 'AMQP needs to be initialized before usage. See taube README.md')
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Subscriber({ key })
  }, 'AMQP needs to be initialized before usage. See taube README.md')
})

test.serial('throws if amqp cannot connect', async t => {
  await t.throwsAsync(
    () => taube.init({
      amqp:
      {
        uri: 'amqp://invalid-uri'
      }
    }),
    { code: 'ENOTFOUND' }
  )
})

test.serial('amqp can connect', async t => {
  await t.notThrowsAsync(() => taube.init())
})


test.serial(' publisher and subscriber require keys', async t => {
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Publisher()
  }, 'Publisher requires "options" property "key" to be set')
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Publisher({})
  }, 'Publisher requires "options" property "key" to be set')
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Subscriber()
  }, 'Subscriber requires "options" property "key" to be set')
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Subscriber({})
  }, 'Subscriber requires "options" property "key" to be set')
})


test.serial('publisher publish fails with wrong function call', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const publisher = new taube.Publisher({ key })
  await t.throwsAsync(() => publisher.publish({}), 'First argument to publish must be the topic (a string)')
})

test.serial('subscriber on fails with wrong function call', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const subscriber = new taube.Subscriber({ key })
  await t.throwsAsync(() => subscriber.on({}), 'First argument to "on" must be the topic (a string)')
  await t.throwsAsync(() => subscriber.on('', ''), 'Second argument to "on" must be a function')
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

test.serial('publisher publishes both on cote and amqp if cote is not disabled', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const data = { test: 1, test2: 2, data: { data: 1 } }
  const publisher = new taube.Publisher({ key })

  const res = await publisher.publish(`test-topic-${globalTestCounter}`, data)
  t.true(res.usedCote)
  t.true(res.usedAmqp)
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
    async() =>
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
    async() =>
      publisher.publish(`test-topic-${globalTestCounter}`, { data: 1 }),
    'test error amqp subscribe error'
  )
})

test.serial('subscriber does re-setup if queue is deleted', async t => {
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

  // This will trigger a re-build of all subscribers
  await subscriber.channel.deleteQueue(subscriber.q.queue)

  // Wait for the subscriber to re-setup everything
  await new Promise(resolve => {
    const interval = setInterval(() => {
      if (subscriber.consumer) {
        clearInterval(interval)
        resolve()
      }
    }, 100)
  })

  await publisher.publish(`test-topic-${globalTestCounter}`, data)

  const res = await promise1
  t.deepEqual(res, data)
})

test.after(async() => {
  await taube.shutdown()
})
