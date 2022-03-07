/* eslint-disable require-await */
const test = require('ava')
const consts = require('./helper/consts')

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_UNIT_TESTS = true

process.env.TAUBE_AMQP_URI = consts.TEST_AMQP_URI

const taube = require('../lib')

// Every test file (pub-sub*.test.js) needs a different start integer
let globalTestCounter = 100

test.serial('can publish and subscribe one to one when debug is disabled', async(t) => {
  await taube.amqp.init()
  globalTestCounter++
  const key = `test-key${globalTestCounter}`
  const data = { test: 1, test2: 2, data: { data: 1 } }
  const publisher = new taube.Publisher({ key })
  const subscriber = new taube.Subscriber({ key })

  let resolve1
  const promise1 = new Promise((resolve) => {
    resolve1 = resolve
  })
  await subscriber.on(`test-topic-${globalTestCounter}`, (res) => {
    resolve1(res)
  })

  await publisher.publish(`test-topic-${globalTestCounter}`, data)

  const res = await promise1
  t.deepEqual(res, data)
})

test.after(async() => {
  await taube.shutdown()
})
