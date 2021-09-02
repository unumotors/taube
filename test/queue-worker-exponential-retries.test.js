/* eslint-disable require-await */
/* eslint-disable global-require */
const test = require('ava')
const consts = require('./helper/consts')
const { waitUntil } = require('./helper/util')

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_DEBUG = true
process.env.TAUBE_AMQP_URI = consts.TEST_AMQP_URI

const taube = require('../lib')

const { Queue, Worker } = taube.QueueWorkerExponentialRetries

let globalTestCounter = 9363

const purgeQueue = async(channel, queueName) => {
  const potentialPromise = channel.purgeQueue(queueName)
  return potentialPromise && potentialPromise.then().catch(() => { })
}
let channel

test.before(async() => {
  taube.amqp.init()
  // Delete used queues after each tests run
  channel = await taube.amqp.channel()
})

test.beforeEach(async(t) => {
  globalTestCounter++
  const queueName = `queue-name-${globalTestCounter}`

  await purgeQueue(channel, queueName)
  await purgeQueue(channel, `${queueName}.retry.1`)
  await purgeQueue(channel, `${queueName}.retry.10`)
  await purgeQueue(channel, `${queueName}.retry.60`)
  await purgeQueue(channel, `${queueName}.retry.600`)
  await purgeQueue(channel, `${queueName}.retry.86400`)

  t.context = {
    queueName
  }
})

test.serial('Queue/Worker check for required parameters', async t => {
  t.throws(() => {
    // eslint-disable-next-line no-new
    new Queue()
  }, { message: '"queueName" needs to be set' })
  t.throws(() => {
    // eslint-disable-next-line no-new
    new Worker()
  }, { message: '"queueName" needs to be set' })
  await t.throwsAsync(async() => {
    // eslint-disable-next-line no-new
    const worker = new Worker('name')
    await worker.consume()
  }, { message: 'First argument to "consume" must be a function' })
})

test.serial('Queue does handle init() lazily', async t => {
  const { queueName } = t.context
  const queue = new Queue(queueName)

  await Promise.all([
    t.notThrowsAsync(async() => {
      await queue.enqueue({})
    }),
    t.notThrowsAsync(async() => {
      await queue.enqueue({})
    }),
    t.notThrowsAsync(async() => {
      await queue.enqueue({})
    }),
    t.notThrowsAsync(async() => {
      await queue.enqueue({})
    }),
    t.notThrowsAsync(async() => {
      await queue.enqueue({})
    })
  ])

  await taube.amqp.shutdownChannel(queue.channel)
})

test.serial('Worker.deathCount works as expected', async t => {
  const { queueName } = t.context
  const queue = new Queue(queueName)

  t.is(queue.deathCount({}), 0)
  t.is(queue.deathCount({
    'x-death': [{ queue: 'banana' }]
  }), 0)
  t.is(queue.deathCount({
    'x-death': [
      { count: 1, queue: queueName },
      { count: 3, queue: queueName }
    ]
  }), 4)
})

test.serial('Worker does handle init() lazily', async t => {
  const { queueName } = t.context
  const worker = new Worker(queueName)

  await Promise.all([
    t.notThrowsAsync(async() => {
      await worker.consume(() => {})
    }),
    t.notThrowsAsync(async() => {
      await worker.consume(() => {})
    }),
    t.notThrowsAsync(async() => {
      await worker.consume(() => {})
    }),
    t.notThrowsAsync(async() => {
      await worker.consume(() => {})
    }),
    t.notThrowsAsync(async() => {
      await worker.consume(() => {})
    })
  ])

  await taube.amqp.shutdownChannel(worker.channel)
})


test.serial('getRetryQueue() does lazy-initialize retry queues', async t => {
  const { queueName } = t.context
  const worker = new Worker(queueName)

  await worker.consume(() => {})

  const retryQueueName = `${queueName}.retry.1`
  const retryQueue = await worker.getRetryQueue(worker.channel, 1)
  t.is(retryQueue, retryQueueName)
  t.is(worker.retryQueues[retryQueue], retryQueueName)
  const retryQueue2 = await worker.getRetryQueue(worker.channel, 1)
  t.is(retryQueue, retryQueue2)
})

test.serial('Worker does does re-setup if queue is deleted', async t => {
  const { queueName } = t.context
  const worker = new Worker(queueName)

  await worker.consume(() => {}) // calls init() implicitly

  // This will cancel all consumers attached to this queue
  // eslint-disable-next-line no-underscore-dangle
  await worker.channel._channel.deleteQueue(queueName)

  // Wait for the worker1 to re-setup consumer
  await waitUntil(() => worker.channel != undefined, 100)

  await t.notThrowsAsync(async() => {
    // eslint-disable-next-line no-underscore-dangle
    await worker.channel._channel.checkQueue(queueName)
  })
})


test.serial('can set a prefetch value on a Worker', async t => {
  const { queueName } = t.context
  const worker1 = new Worker(
    queueName,
    { worker: { prefetch: 3 } }
  )

  t.is(worker1.options.worker.prefetch, 3)
})

test.serial('can enqueue and consume one to one', async t => {
  const { queueName } = t.context
  const queue = new Queue(queueName)
  const worker1 = new Worker(queueName)

  let resolve1
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  await worker1.consume((data) => {
    resolve1(data)
  })

  const dataPackage1 = { test: 1 }

  await queue.enqueue(dataPackage1)

  const res = await promise1
  t.deepEqual(res, dataPackage1)

  // await the workes to acknowlege
  await taube.amqp.shutdownChannel(queue.channel)
  await taube.amqp.shutdownChannel(worker1.channel)
})


test.serial('can pass a header', async t => {
  const { queueName } = t.context
  const queue = new Queue(queueName)
  const worker1 = new Worker(queueName)
  const header = { tracingId: 'some-id' }

  let resolve1
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  await worker1.consume((data, headers) => {
    resolve1({ data, headers })
  })

  const dataPackage1 = { test: 1 }

  await queue.enqueue(dataPackage1, header)

  const { data, headers } = await promise1
  t.deepEqual(data, dataPackage1)
  t.is(headers.tracingId, 'some-id')

  // await the workes to acknowlege
  await taube.amqp.shutdownChannel(queue.channel)
  await taube.amqp.shutdownChannel(worker1.channel)
})

test.serial('does retry a failed message correctly', async t => {
  const { queueName } = t.context

  const queue = new Queue(queueName)
  const worker1 = new Worker(queueName, { delays: [1, 2, 3, 4] })

  let resolve1
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })

  let lastProcessedDate
  let count = 0
  await worker1.consume((data, headers) => {
    count++
    if (count != 1) {
      const duration = new Date() - lastProcessedDate
      const expectation = (count - 1) * 1000
      t.true(
        duration >= expectation,
        `should have stayed in the retry queue minimum of ${expectation}. Did only stay ${duration}`
      )
      const header = headers['x-death'].find(header => header.queue == `${queueName}.retry.${count - 1}`)
      t.truthy(header)
    }
    lastProcessedDate = new Date()
    if (count != 5) throw new Error('test')
    resolve1(data)
  })

  const dataPackage1 = { test: 1 }

  await queue.enqueue(dataPackage1)

  const res = await promise1
  t.deepEqual(res, dataPackage1)

  // await the workes to acknowlege
  await taube.amqp.shutdownChannel(queue.channel)
  await taube.amqp.shutdownChannel(worker1.channel)
})

test.serial('a message ends up in the error handler if there are no delays left', async t => {
  const { queueName } = t.context

  let resolve1
  let promise = new Promise(async resolve => {
    resolve1 = resolve
  })

  const queue = new Queue(queueName)
  const worker1 = new Worker(queueName, {
    delays: [1],
    errorHandler: (data) => {
      resolve1(data)
    }
  })

  const fakeError = new Error('test')

  await worker1.consume(() => {
    throw fakeError
  })

  await queue.enqueue({ data: 'test' })

  const {
    error, message, payload, instance
  } = await promise
  t.deepEqual(payload, { data: 'test' })
  t.is(instance.name, queueName)
  t.is(error, fakeError)
  t.is(message.properties.headers['x-death'][0].count, 1)
  t.is(message.fields.routingKey, `${queueName}.1`)

  // await the workes to acknowlege
  await taube.amqp.shutdownChannel(queue.channel)
  await taube.amqp.shutdownChannel(worker1.channel)
})

test.serial('Can recover from an error during retrying a message and call errorHandler', async t => {
  const { queueName } = t.context

  let resolve1
  let promise = new Promise(async resolve => {
    resolve1 = resolve
  })

  const queue = new Queue(queueName)
  const worker1 = new Worker(queueName, {
    delays: [],
    errorHandler: (data) => {
      resolve1(data)
    }
  })

  worker1.retryMessage = () => {
    throw new Error('retry failed')
  }


  await worker1.consume(() => {
    throw new Error('test')
  })

  await queue.enqueue({})

  const { error } = await promise

  t.is(error.message, 'retry failed')

  // await the workes to acknowlege
  await taube.amqp.shutdownChannel(queue.channel)
  await taube.amqp.shutdownChannel(worker1.channel)
})


test.after(async() => {
  await taube.shutdown()
})
