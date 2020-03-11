/* eslint-disable require-await */
/* eslint-disable global-require */
const test = require('ava')

process.env.TAUBE_HTTP_ENABLED = true

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_DEBUG = true

process.env.TAUBE_AMQP_URI = 'amqp://guest:guest@localhost'
process.env.TAUBE_AMQP_ENABLED = true

const taube = require('../lib')

let globalTestCounter = 600

test.serial('amqp can connect', async t => {
  await t.notThrowsAsync(() => taube.init())
})

test.afterEach(async() => {
  // Purge used queue from all channels after each tests run
  await Promise.all(taube.amqp.getChannels().map(channel =>
    channel.purgeQueue(`test-key${globalTestCounter}`)
      .catch(() => {}))) // If channel has already been closed, ignore
})

test.serial('queue and worker require keys', async t => {
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Queue()
  }, 'Queue requires "options" property "key" to be set')
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Queue({})
  }, 'Queue requires "options" property "key" to be set')
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Worker()
  }, 'Worker requires "options" property "key" to be set')
  t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Worker({})
  }, 'Worker requires "options" property "key" to be set')
})

test.serial('woker consume call fails with wrong call', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const worker = new taube.Worker({ key })
  await t.throwsAsync(() => worker.consume({}), 'First argument to "consume" must be a function')
})

test.serial('can enqueue and consume one to two', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const queue = new taube.Queue({ key })
  const worker1 = new taube.Worker({ key })

  let resolve1
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  await worker1.consume((data) => {
    resolve1(data)
  })

  const worker2 = new taube.Worker({ key })

  let resolve2
  let promise2 = new Promise(async resolve => {
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

test.serial('worker prefetch is one by default', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const queue = new taube.Queue({ key })
  const worker1 = new taube.Worker({ key })

  let resolve1, resolve2
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  let promise2 = new Promise(async resolve => {
    resolve2 = resolve
  })
  let count = 0
  let lastData
  await worker1.consume((data) => {
    lastData = data
    count++
    t.is(data.test, count)
    if (count == 1) {
      resolve1()
    }
    if (count == 2) {
      resolve2()
    }
  })

  const dataPackage1 = { test: 1 }
  const dataPackage2 = { test: 2 }

  await queue.enqueue(dataPackage1)
  await queue.enqueue(dataPackage2)

  await promise1
  t.is(count, 1)
  t.deepEqual(lastData, dataPackage1)
  await promise2
  t.is(count, 2)

  // Wait for the workers to acknowledge
  await taube.amqp.shutdownChannel(worker1.channel)
})

test.serial('can change prefetch to more than one message', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const queue = new taube.Queue({ key })
  const worker1 = new taube.Worker({ key, prefetch: 2 })

  let resolve1
  let promise1 = new Promise(async resolve => {
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

test.serial('a worker can only "consume" once', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const worker1 = new taube.Worker({ key })
  await worker1.consume(() => {})
  await t.throwsAsync(() => worker1.consume(() => {}), 'There can only be one "consume"er per Worker')
})

test.after(async() => {
  await taube.shutdown()
})
