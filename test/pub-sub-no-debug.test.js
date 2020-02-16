/* eslint-disable require-await */
const test = require('ava')

process.env.TAUBE_HTTP_ENABLED = true

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test

process.env.TAUBE_AMQP_URI = 'amqp://guest:guest@localhost'
process.env.TAUBE_AMQP_ENABLED = true

const taube = require('../lib')

// Every test file (pub-sub*.test.js) needs a different start integer
let globalTestCounter = 100

test.serial('can publish and subscribe one to one when debug is disabled', async t => {
  await taube.init()
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

test.after(async() => {
  await taube.shutdown()
})

