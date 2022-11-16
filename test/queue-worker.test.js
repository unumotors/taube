/* eslint-disable require-await */
/* eslint-disable global-require */
import test from 'ava'

import consts from './helper/consts.js'
import { waitUntil } from './helper/util.js'

import taube, { shutdown } from '../lib/index.js'

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_DEBUG = true
process.env.TAUBE_UNIT_TESTS = true

let globalTestCounter = 600

const purgeQueue = async(queueName) => {
  await Promise.all(taube.amqp.getChannels().map((channel) => {
    const potentialPromise = channel.purgeQueue(queueName)
    return potentialPromise && potentialPromise.then().catch(() => { })
  }))
}

test.after(async() => {
  await shutdown()
})

test.afterEach(async() => {
  // Delete used queues after each tests run
  await purgeQueue(`test-key${globalTestCounter}`)
  await purgeQueue(`error-test-key${globalTestCounter}`)
})

test.serial('queue and worker require keys', (t) => {
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Queue()
  }, { message: 'Queue requires "options" property "key" to be set' })
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Queue({})
  }, { message: 'Queue requires "options" property "key" to be set' })
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Worker()
  }, { message: 'Worker requires "options" property "key" to be set' })
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Worker({})
  }, { message: 'Worker requires "options" property "key" to be set' })
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Queue({ key: 'key' })
  }, { message: '"options.brokerUri" needs to be set' })

  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Worker({ key: 'key' })
  }, { message: '"options.brokerUri" needs to be set' })
})

test.serial('woker consume call fails with wrong call', async(t) => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const worker = new taube.Worker({ key, brokerUri: consts.brokerUri })
  await t.throwsAsync(() => worker.consume({}), { message: 'First argument to "consume" must be a function' })
})

test.serial('can enqueue and consume one to two', async(t) => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const queue = new taube.Queue({ key, brokerUri: consts.brokerUri })
  const worker1 = new taube.Worker({ key, brokerUri: consts.brokerUri })

  let resolve1
  const promise1 = new Promise((resolve) => {
    resolve1 = resolve
  })
  await worker1.consume((data) => {
    resolve1(data)
  })

  const worker2 = new taube.Worker({ key, brokerUri: consts.brokerUri })

  let resolve2
  const promise2 = new Promise((resolve) => {
    resolve2 = resolve
  })
  await worker2.consume((data) => {
    resolve2(data)
  })

  const dataPackage1 = { test: 1 }
  const dataPackage2 = { test: 2 }

  await queue.enqueue(dataPackage1)
  await queue.enqueue(dataPackage2)

  const res = await promise1
  t.deepEqual(res, dataPackage1)

  const res2 = await promise2
  t.deepEqual(res2, dataPackage2)

  // await the workes to acknowlege
  await taube.amqp.shutdownChannel(worker1.channel)
  await taube.amqp.shutdownChannel(worker2.channel)
})

test.serial('worker prefetch is one by default', async(t) => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const queue = new taube.Queue({ key, brokerUri: consts.brokerUri })
  const worker1 = new taube.Worker({ key, brokerUri: consts.brokerUri })

  let resolve1; let resolve2; let resolve3
  const promise1 = new Promise((resolve) => {
    resolve1 = resolve
  })
  const promise2 = new Promise((resolve) => {
    resolve2 = resolve
  })
  const promise3 = new Promise((resolve) => {
    resolve3 = resolve
  })
  let count = 0
  let finishedConsumer1 = false
  let finishedConsumer2 = false
  await worker1.consume(async(data) => {
    count++
    if (count == 1) {
      await promise1
      t.is(finishedConsumer2, false)
      t.is(data.test, count)
      finishedConsumer1 = true
    }
    if (count == 2) {
      await promise2
      t.is(finishedConsumer1, true)
      t.is(data.test, count)
      finishedConsumer2 = true
      resolve3()
    }
  })

  const dataPackage1 = { test: 1 }
  const dataPackage2 = { test: 2 }

  await queue.enqueue(dataPackage1)
  await queue.enqueue(dataPackage2)

  resolve1()
  resolve2()

  await promise3
  // Wait for the workers to acknowledge
  await taube.amqp.shutdownChannel(worker1.channel)
})

test.serial('can change prefetch to more than one message', async(t) => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const queue = new taube.Queue({ key, brokerUri: consts.brokerUri })
  const worker1 = new taube.Worker({ key, prefetch: 2, brokerUri: consts.brokerUri })

  let resolve1
  const promise1 = new Promise((resolve) => {
    resolve1 = resolve
  })
  let count = 0
  await worker1.consume((data) => {
    count++
    t.is(data.test, count)
    if (count == 2) resolve1()
  })

  const dataPackage1 = { test: 1 }
  const dataPackage2 = { test: 2 }

  await queue.enqueue(dataPackage1)
  await queue.enqueue(dataPackage2)

  await promise1
  t.is(count, 2)
})

test.serial('a worker can only "consume" once', async(t) => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const worker1 = new taube.Worker({ key, brokerUri: consts.brokerUri })
  await worker1.consume(() => {})
  await t.throwsAsync(() => worker1.consume(() => {}), { message: 'There can only be one "consume"er per Worker' })
})

test.serial('worker does re-setup if queue is deleted', async(t) => {
  t.plan(8)
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const queue = new taube.Queue({ key, brokerUri: consts.brokerUri })
  const worker1 = new taube.Worker({ key, brokerUri: consts.brokerUri })
  const dataPackage1 = { test: 1, data: { data: 1 } }
  const dataPackage2 = { test: 2, data: { data: 2 } }
  let resolve1
  const promise1 = new Promise((resolve) => {
    resolve1 = resolve
  })

  let count = 0
  let finishedConsumer1 = false
  let finishedConsumer2 = false
  let initialWorkerTag
  await worker1.consume(async(data) => {
    count++
    if (count == 1) {
      t.is(finishedConsumer2, false)
      t.is(data.test, count)
      t.deepEqual(data, dataPackage1)
      finishedConsumer1 = true
      initialWorkerTag = worker1.consumer.consumerTag // initial consumer tag to compare later
    }
    if (count == 2) {
      t.is(finishedConsumer1, true)
      t.is(data.test, count)
      t.deepEqual(data, dataPackage2)
      finishedConsumer2 = true
      t.not(initialWorkerTag, worker1.consumer.consumerTag, 'worker should have a new consumer tag after re-setup')
      resolve1()
    }
  })

  await queue.enqueue(dataPackage1)

  // This will cancel all consumers attached to this queue
  // eslint-disable-next-line no-underscore-dangle
  await queue.channel._channel.deleteQueue(key)

  // eslint-disable-next-line no-underscore-dangle
  await queue.channel._channel.deleteQueue(`error-${key}`)

  // Wait for the worker1 to re-setup consumer
  await waitUntil(() => worker1.consumer && initialWorkerTag != worker1.consumer.consumerTag)

  // eslint-disable-next-line no-underscore-dangle
  await t.notThrowsAsync(queue.channel._channel.checkQueue(`error-${key}`))

  await queue.enqueue(dataPackage2)
  await promise1
})

test.serial(
  'Error queue and dead letter exchange should be created along with the initial queue setup',
  async(t) => {
    t.plan(2)
    globalTestCounter++
    const key = `test-key${globalTestCounter}`
    const queue = new taube.Queue({ key, brokerUri: consts.brokerUri })

    // to set the channel and assert the queues, we publish a message
    await queue.enqueue({ data: 'test' })

    // eslint-disable-next-line no-underscore-dangle
    await t.notThrowsAsync(queue.channel._channel.checkQueue(`error-${key}`))

    // eslint-disable-next-line no-underscore-dangle
    await t.notThrowsAsync(queue.channel._channel.checkExchange('DeadExchange'))

    await taube.amqp.shutdownChannel(queue.channel)
  },
)

test.serial('Message should be dead-lettered when consumer throws', async(t) => {
  t.plan(5)
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const queue = new taube.Queue({ key, brokerUri: consts.brokerUri })
  const worker1 = new taube.Worker({ key, brokerUri: consts.brokerUri })
  const errorWorker = new taube.Worker({ key: `error-${key}`, brokerUri: consts.brokerUri })
  const dataPackage = { test: 1, data: { data: 1 } }

  await worker1.consume((data) => {
    t.deepEqual(data, dataPackage)
    // dead-lettering the message
    throw new Error()
  })

  let resolve1
  const promise1 = new Promise((resolve) => {
    resolve1 = resolve
  })

  await errorWorker.consume(async(data, headers) => {
    t.deepEqual(data, dataPackage)

    const xDeathHeader = headers['x-death'][0]
    delete (xDeathHeader.time)
    t.deepEqual(xDeathHeader, {
      'count': 1,
      'reason': 'rejected',
      'queue': key,
      'exchange': '',
      'routing-keys': [key],
    })
    resolve1()
  })

  await queue.enqueue(dataPackage)
  await promise1

  // Wait for the workers to acknowledge
  await taube.amqp.shutdownChannel(worker1.channel)

  // eslint-disable-next-line no-underscore-dangle
  const { messageCount, consumerCount } = await queue.channel._channel.checkQueue(key)
  t.is(messageCount, 0, 'There should be no message in the original queue')
  t.is(consumerCount, 0, 'Consumer channel should be closed')
})

test.serial(
  'Should throw an error when dead letter exhanges do not match in queue and worker setups',
  async(t) => {
    t.plan(3)
    globalTestCounter++
    const key = `test-key${globalTestCounter}`
    const queue = new taube.Queue({
      key,
      deadLetterExchange: 'test-dead-letter-exchange-1',
      brokerUri: consts.brokerUri,
    })
    const worker = new taube.Worker({
      key,
      deadLetterExchange: 'test-dead-letter-exchange-2',
      brokerUri: consts.brokerUri,
    })

    await queue.enqueue({ data: 'test' })
    // We do the cleanup here bevause the channel will be closed with the error below
    // and it won't be possible to purge the queue
    await queue.channel.purgeQueue()

    const { code, message } = await t.throwsAsync(worker.consume(() => {}))
    t.is(code, 406)
    t.regex(message, /QueueDeclare; 406 \(PRECONDITION-FAILED\) with message "PRECONDITION_FAILED - inequivalent arg/)

    await taube.amqp.shutdownChannel(worker.channel)
  },
)

test.serial('Message should be dead-lettered through a custom dead letter exhange', async(t) => {
  t.plan(5)
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const deadLetterExchange = 'test-dead-letter-exchange'
  const queue = new taube.Queue({ key, deadLetterExchange, brokerUri: consts.brokerUri })
  const worker1 = new taube.Worker({ key, deadLetterExchange, brokerUri: consts.brokerUri })
  const errorWorker = new taube.Worker({ key: `error-${key}`, deadLetterExchange, brokerUri: consts.brokerUri })
  const dataPackage = { test: 1, data: { data: 1 } }

  await worker1.consume((data) => {
    t.deepEqual(data, dataPackage)
    // dead-lettering the message
    throw new Error()
  })

  let resolve1
  const promise1 = new Promise((resolve) => {
    resolve1 = resolve
  })

  await errorWorker.consume(async(data, headers) => {
    t.deepEqual(data, dataPackage)

    const xDeathHeader = headers['x-death'][0]
    delete (xDeathHeader.time)
    t.deepEqual(xDeathHeader, {
      'count': 1,
      'reason': 'rejected',
      'queue': key,
      'exchange': '',
      'routing-keys': [key],
    })
    resolve1()
  })

  await queue.enqueue(dataPackage)
  await promise1

  // Wait for the workers to acknowledge
  await taube.amqp.shutdownChannel(worker1.channel)

  // eslint-disable-next-line no-underscore-dangle
  const { messageCount, consumerCount } = await queue.channel._channel.checkQueue(key)
  t.is(messageCount, 0, 'There should be no message in the original queue')
  t.is(consumerCount, 0, 'Consumer channel should be closed')
})

test.serial('Should re-queue dead-lettered message from an error-queue', async(t) => {
  t.plan(8)
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const errorKey = `error-${key}`
  const queue = new taube.Queue({ key, brokerUri: consts.brokerUri })
  const worker1 = new taube.Worker({ key, brokerUri: consts.brokerUri })
  const errorWorker = new taube.Worker({ key: errorKey, brokerUri: consts.brokerUri })
  const dataPackage = { test: 1, data: { data: 1 } }

  let resolve1
  let resolve2
  const promise1 = new Promise((resolve) => {
    resolve1 = resolve
  })
  const promise2 = new Promise((resolve) => {
    resolve2 = resolve
  })

  let retryCounter = 0
  await worker1.consume((data) => {
    t.deepEqual(data, dataPackage)
    // dead-lettering the message for the first consumption
    if (retryCounter == 0) {
      retryCounter++
      throw new Error()
    }
    // message should be acked for the second consumption
    resolve2()
  })

  await errorWorker.consume(async(data, headers) => {
    t.deepEqual(data, dataPackage)

    const xDeathHeader = headers['x-death'][0]
    delete (xDeathHeader.time)
    t.deepEqual(xDeathHeader, {
      'count': 1,
      'reason': 'rejected',
      'queue': key,
      'exchange': '',
      'routing-keys': [key],
    })

    // Republishing the message according to the queue information found in it's x-death header
    // eslint-disable-next-line no-underscore-dangle
    queue.channel._channel.sendToQueue(
      xDeathHeader.queue,
      Buffer.from(JSON.stringify(data)),
      {
        persistent: true,
      },
    )

    resolve1()
  })

  await queue.enqueue(dataPackage)
  await promise1 // error worker should finish requeuing first
  await promise2 // worker should ack the second time

  // Wait for the workers to acknowledge
  await taube.amqp.shutdownChannel(worker1.channel)
  await taube.amqp.shutdownChannel(errorWorker.channel)

  // eslint-disable-next-line no-underscore-dangle
  const originalQueueStats = await queue.channel._channel.checkQueue(key)
  t.is(originalQueueStats.messageCount, 0, 'There should be no message in the original queue')
  t.is(originalQueueStats.consumerCount, 0, 'Consumer channel should be closed')

  // eslint-disable-next-line no-underscore-dangle
  const errorQueueStats = await queue.channel._channel.checkQueue(errorKey)
  t.is(errorQueueStats.messageCount, 0, 'There should be no message in the error queue')
  t.is(errorQueueStats.consumerCount, 0, 'Error worker channel should be closed')
})
