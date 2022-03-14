/* eslint-disable require-await */
/* eslint-disable global-require */
const test = require('ava')
const sinon = require('sinon')
const MQTT = require('async-mqtt')
const { IllegalOperationError } = require('amqplib/lib/error')
const consts = require('./helper/consts')
const { waitUntil } = require('./helper/util')

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_DEBUG = true
process.env.TAUBE_UNIT_TESTS = true

const mqttOptions = {
  host: consts.mqttHost,
  port: 1883,
  protocol: 'mqtt', // no tls
  username: 'guest',
  password: 'guest',
}

const taube = require('../lib')

const { Queue, Worker } = taube.QueueWorkerExponentialRetries

let globalTestCounter = 9363

const purgeQueue = async(channel, queueName) => {
  const potentialPromise = channel.purgeQueue(queueName)
  return potentialPromise && potentialPromise.then().catch(() => { })
}
let channel

test.before(async() => {
  // Delete used queues after each tests run
  channel = await taube.amqp.channel({ brokerUri: consts.brokerUri })
})

test.after(async() => {
  await taube.shutdown()
})

test.beforeEach(async(t) => {
  sinon.restore()
  globalTestCounter++
  const queueName = `queue-name-${globalTestCounter}`

  await purgeQueue(channel, queueName)
  await purgeQueue(channel, `${queueName}.retry.1`)
  await purgeQueue(channel, `${queueName}.retry.10`)
  await purgeQueue(channel, `${queueName}.retry.60`)
  await purgeQueue(channel, `${queueName}.retry.600`)
  await purgeQueue(channel, `${queueName}.retry.86400`)

  t.context = {
    queueName,
  }
})

test.serial('Queue/Worker check for required parameters', async(t) => {
  t.throws(() => {
    // eslint-disable-next-line no-new
    new Queue()
  }, { message: '"queueName" needs to be set' })

  t.throws(() => {
    // eslint-disable-next-line no-new
    new Queue('name', {})
  }, { message: '"options.brokerUri" needs to be set' })

  t.throws(() => {
    // eslint-disable-next-line no-new
    new Worker()
  }, { message: '"queueName" needs to be set' })

  t.throws(() => {
    // eslint-disable-next-line no-new
    new Worker('name', {})
  }, { message: '"options.brokerUri" needs to be set' })

  await t.throwsAsync(async() => {
    // eslint-disable-next-line no-new
    const worker = new Worker('name', { brokerUri: consts.brokerUri })
    await worker.consume()
  }, { message: 'First argument to "consume" must be a function' })
})

test.serial('Initialization fails with invalid format of extraKeyBindings', async(t) => {
  const { queueName } = t.context

  await t.throwsAsync(async() => {
    // eslint-disable-next-line no-new
    new Worker(
      queueName,
      {
        brokerUri: consts.brokerUri,
        extraKeyBindings: [{}],
      },
    )
  }, {
    message: 'Option "extraKeyBindings" is missing "exchange". Format: [{ exchange:"", routingKey:""}',
  })

  await t.throwsAsync(async() => {
    // eslint-disable-next-line no-new
    new Worker(
      queueName,
      {
        brokerUri: consts.brokerUri,
        extraKeyBindings: [{ exchange: 'some-exchange' }],
      },
    )
  }, {
    message: 'Option "extraKeyBindings" is missing "routingKey". Format: [{ exchange:"", routingKey:""}',
  })
})

test.serial('Queue does handle init() lazily', async(t) => {
  const { queueName } = t.context
  const queue = new Queue(queueName, { brokerUri: consts.brokerUri })

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
    }),
  ])

  await taube.amqp.shutdownChannel(queue.channel)
})

test.serial('Worker.deathCount works as expected', (t) => {
  const { queueName } = t.context
  const queue = new Queue(queueName, { brokerUri: consts.brokerUri })

  t.is(queue.deathCount({}), 0)
  t.is(queue.deathCount({
    'x-death': [{ queue: 'banana' }],
  }), 0)
  t.is(queue.deathCount({
    'x-death': [
      { count: 1, queue: queueName },
      { count: 3, queue: queueName },
    ],
  }), 4)
})

test.serial('Worker does handle init() lazily', async(t) => {
  const { queueName } = t.context
  const worker = new Worker(queueName, { brokerUri: consts.brokerUri })

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
    }),
  ])

  await taube.amqp.shutdownChannel(worker.channel)
})

test.serial('IllegalOperationError error thrown by channel.nack function is console logged', async(t) => {
  const { queueName } = t.context

  const worker = new Worker(queueName, { brokerUri: consts.brokerUri })
  await worker.consume(() => {})

  const nackError = new IllegalOperationError('Channel closed', 'stack')
  const nackStub = sinon.stub(worker.channel, 'nack').rejects(nackError)

  const message = {
    fields: {
      consumerTag: 'amq.ctag-6Uq46xFhfCt2eICdhl8uFw',
      deliveryTag: 1,
      redelivered: false,
      exchange: '',
      routingKey: 'queue-name-9371',
    },
    properties: {
      headers: {},
      deliveryMode: 2,
    },
    content: {
      type: 'Buffer',
      data: [],
    },
  }

  const logs = sinon.stub(console, 'error')
  const res = await t.throwsAsync(worker.handleErrorMessage({ channel: worker.channel, message }))

  t.is(res.message, 'Channel closed')
  t.is(res.stackAtStateChange, 'stack')
  t.true(nackStub.calledOnce)
  t.is(logs.callCount, 3)
  t.deepEqual(logs.getCall(0).args[0], nackError)
  t.regex(logs.getCall(1).args[0], /IllegalOperationError: Channel closed/)
  t.is(logs.getCall(2).args[0], 'stack')
})

test.serial('Worker does does re-setup if queue is deleted', async(t) => {
  const { queueName } = t.context
  const worker = new Worker(queueName, { brokerUri: consts.brokerUri })

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

test.serial('can set a prefetch value on a Worker', (t) => {
  const { queueName } = t.context
  const worker1 = new Worker(
    queueName,
    {
      worker: { prefetch: 3 },
      brokerUri: consts.brokerUri,
    },
  )

  t.is(worker1.options.worker.prefetch, 3)
})

test.serial('can enqueue and consume one to one', async(t) => {
  const { queueName } = t.context
  const queue = new Queue(queueName, { brokerUri: consts.brokerUri })
  const worker1 = new Worker(queueName, { brokerUri: consts.brokerUri })

  let resolve1
  const promise1 = new Promise((resolve) => {
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

test.serial('can pass a header', async(t) => {
  const { queueName } = t.context
  const queue = new Queue(queueName, { brokerUri: consts.brokerUri })
  const worker1 = new Worker(queueName, { brokerUri: consts.brokerUri })
  const header = { tracingId: 'some-id' }

  let resolve1
  const promise1 = new Promise((resolve) => {
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

test.serial('does retry a failed message correctly', async(t) => {
  const { queueName } = t.context

  const queue = new Queue(queueName, { brokerUri: consts.brokerUri })
  const worker1 = new Worker(queueName, {
    delays: [1, 2, 3, 4],
    brokerUri: consts.brokerUri,
  })

  let resolve1
  const promise1 = new Promise((resolve) => {
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
        `should have stayed in the retry queue minimum of ${expectation}. Did only stay ${duration}`,
      )
      const workerheader = headers['x-death'].find((header) => header.queue == `${queueName}.retry.${count - 1}`)
      t.truthy(workerheader)
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

test.serial('a message ends up in the error handler if there are no delays left', async(t) => {
  const { queueName } = t.context

  let resolve1
  const promise = new Promise((resolve) => {
    resolve1 = resolve
  })

  const queue = new Queue(queueName, { brokerUri: consts.brokerUri })
  const worker1 = new Worker(queueName, {
    delays: [1],
    errorHandler: (data) => {
      resolve1(data)
    },
    brokerUri: consts.brokerUri,
  })

  const fakeError = new Error('test')

  await worker1.consume(() => {
    throw fakeError
  })

  await queue.enqueue({ data: 'test' })

  const {
    error, message, payload, instance,
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

test.serial('Can recover from an error during retrying a message and call errorHandler', async(t) => {
  const { queueName } = t.context

  let resolve1
  const promise = new Promise((resolve) => {
    resolve1 = resolve
  })

  const queue = new Queue(queueName, { brokerUri: consts.brokerUri })
  const worker1 = new Worker(queueName, {
    delays: [],
    errorHandler: (data) => {
      resolve1(data)
    },
    brokerUri: consts.brokerUri,
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

test.serial('can use custom key bindings to get MQTT messages', async(t) => {
  const { queueName } = t.context

  // Setup worker
  const worker1 = new Worker(queueName, {
    brokerUri: consts.brokerUri,
    extraKeyBindings: [
      {
        exchange: 'amq.topic',
        routingKey: '#.telemetry',
      },
      {
        exchange: 'amq.topic',
        routingKey: '#.command',
      },
    ],
  })

  let resolve1
  const promise1 = new Promise((resolve) => {
    resolve1 = resolve
  })
  let count = 0
  await worker1.consume((data) => {
    count++
    if (count == 2) {
      resolve1(data)
    }
  })

  // Setup MQTT client
  const mqttClient = await MQTT.connectAsync(mqttOptions)
  const dataPackage1 = { test: 1 }
  await mqttClient.publish('VIN123/telemetry', JSON.stringify(dataPackage1), { qos: 1 })
  await mqttClient.publish('VIN123/command', JSON.stringify(dataPackage1), { qos: 1 })

  const res = await promise1
  t.deepEqual(res, dataPackage1)

  await taube.amqp.shutdownChannel(worker1.channel)
  await mqttClient.end()
})

test.serial('can retry using custom key bindings when messages come from MQTT', async(t) => {
  const { queueName } = t.context

  const worker1 = new Worker(queueName, {
    delays: [1, 2, 3],
    brokerUri: consts.brokerUri,
    extraKeyBindings: [
      {
        exchange: 'amq.topic',
        routingKey: '#.telemetry',
      },
    ],
  })

  let resolve1
  const promise1 = new Promise((resolve) => {
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
        `should have stayed in the retry queue minimum of ${expectation}. Did only stay ${duration}`,
      )
      const workerheader = headers['x-death'].find((header) => header.queue == `${queueName}.retry.${count - 1}`)
      t.is(workerheader['routing-keys'][0], `VIN123.telemetry.${count - 1}`)
    }
    lastProcessedDate = new Date()
    if (count != 3) throw new Error('test')
    resolve1(data)
  })

  const dataPackage1 = { test: 1232131 }

  const mqttClient = await MQTT.connectAsync(mqttOptions)
  await mqttClient.publish('VIN123/telemetry', JSON.stringify(dataPackage1), { qos: 1 })

  const res = await promise1
  t.deepEqual(res, dataPackage1)

  // await the workes to acknowlege
  await taube.amqp.shutdownChannel(worker1.channel)
  await mqttClient.end()
})
