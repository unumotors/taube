const test = require('ava')
const consts = require('./helper/consts')

process.env.TAUBE_AMQP_URI = consts.TEST_AMQP_URI

const taube = require('../lib')

test.serial('taube.amqp.init() can be initialized with env variable', async(t) => {
  taube.init()
  await t.notThrowsAsync(async() => await taube.amqp.init())

  await taube.shutdown()
})
