/* eslint-disable require-await */
const test = require('ava')

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_DEBUG = true

process.env.TAUBE_AMQP_URI = 'amqp://guest:guest@localhost'
process.env.TAUBE_AMQP_ENABLED = true
process.env.TAUBE_AMQP_COTE_DISABLED = true
const taube = require('../lib')

// Every test file (pub-sub*.test.js) needs a different start integer
let globalTestCounter = 300

test.before(async() => {
  await taube.init()
})

test.serial('cote is not available and not used when disabled', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const data = { test: 1, test2: 2, data: { data: 1 } }
  const publisher = new taube.Publisher({ key })
  t.falsy(publisher.cote)
  const subscriber = new taube.Subscriber({ key })
  t.falsy(subscriber.cote)

  let resolve1
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  await subscriber.on(`test-topic-${globalTestCounter}`, (data) => {
    resolve1(data)
  })
  const publisherRes = await publisher.publish(`test-topic-${globalTestCounter}`, data)
  t.false(publisherRes.usedCote)
  t.true(publisherRes.usedAmqp)
  const res = await promise1
  t.deepEqual(res, data)
})


test.serial('cote can selectively be enabled for publishers and subscribers', async t => {
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const data = { test: 1, test2: 2, data: { data: 1 } }
  const publisher = new taube.Publisher({ key, coteEnabled: true })
  t.truthy(publisher.cote)
  const subscriber = new taube.Subscriber({ key, coteEnabled: true })
  t.truthy(subscriber.cote)

  let resolve1
  let promise1 = new Promise(async resolve => {
    resolve1 = resolve
  })
  const coteRes = await subscriber.on(`test-topic-${globalTestCounter}`, (data) => {
    resolve1(data)
  })
  t.is(coteRes.advertisement.key, `$$${key}`)

  const publisherRes = await publisher.publish(`test-topic-${globalTestCounter}`, data)
  t.true(publisherRes.usedCote)
  t.true(publisherRes.usedAmqp)
  const res = await promise1
  t.deepEqual(res, data)
})

test.after(async() => {
  await taube.shutdown()
})
