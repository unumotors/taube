/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
const test = require('ava')
const consts = require('./helper/consts')

process.env.TAUBE_AMQP_URI = consts.TEST_AMQP_URI

const taube = require('../lib')

test.serial('taube.amqp.init() can be initialized with env variable', async(t) => {
  await t.notThrowsAsync(async() => {
    let attempt = 0
    /**
     * In CI it can take a bit to get RabbitMQ running.
     *
     * This test gives it time to startup for 10 seconds before calling it a day.
     * As test run in serial, it also makes sure all other tests wait for RabbitMQ
     */
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt++
      try {
        await taube.amqp.init()
        break
      } catch (error) {
        await new Promise((resolve) => { setTimeout(resolve, 1000) }) // Give RabbitMQ a moment to startup in CI, it can be slow
        if (attempt > 10) {
          throw error
        }
      }
    }
  })

  await taube.shutdown()
})
