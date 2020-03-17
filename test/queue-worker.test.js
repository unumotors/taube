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
  await Promise.all(taube.amqp.getChannels().map(channel => {
    const potentialPromise = channel.purgeQueue(`test-key${globalTestCounter}`)
    return potentialPromise && potentialPromise.then().catch(() => {})
  }))
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

  let resolve1, resolve2, resolve3
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  let promise2 = new Promise(async resolve => {
    resolve2 = resolve
  })
  let promise3 = new Promise(async resolve => {
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
