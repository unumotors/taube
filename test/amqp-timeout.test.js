const test = require('ava')
const consts = require('./helper/consts')

process.env.TAUBE_AMQP_INITIAL_CONNECTION_TIMEOUT = '0.00000000000001' // no possible way to connect in this time

test.serial('throws if amqp cannot connect within timeout', async(t) => {
  // eslint-disable-next-line global-require
  const taube = require('../lib')
  const err = await t.throwsAsync(() => taube.amqp.init({
    uri: consts.TEST_AMQP_URI,
  }))
  console.log(err.message, 'amqp-connection-manager: connect timeout')
  await taube.shutdown()
})
