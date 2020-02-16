/* eslint-disable require-await */
const test = require('ava')

process.env.TAUBE_DEBUG = true

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test

const taube = require('../lib')


// Every test file (pub-sub*.test.js) needs a different start integer
let globalTestCounter = 400

test.serial('taube.init can also be called when AMQP is disabled', async t => {
  await t.notThrowsAsync(() => taube.init())
})

test.serial('without enabling amqp taube defaults to cote', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const data = { test: 1, test2: 2, data: { data: 1 } }
  const publisher = new taube.Publisher({ key })
  const subscriber = new taube.Subscriber({ key })

  t.falsy(subscriber.amqp)

  let resolve1
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  const coteRes = await subscriber.on(`test-topic-${globalTestCounter}`, (data) => {
    resolve1(data)
  })
  t.is(coteRes.advertisement.key, `$$${key}`)

  const publisherDebugData = await publisher.publish(`test-topic-${globalTestCounter}`, data)
  t.true(publisherDebugData.usedCote)
  t.false(publisherDebugData.usedAmqp)

  const res = await promise1
  t.deepEqual(res, data)
})

test.after(async() => {
  await taube.shutdown()
})
