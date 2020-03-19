const test = require('ava')

const taube = require('../lib')

test.serial('taube init can be used synchronously', async t => {
  taube.init({ amqp: { uri: 'amqp://guest:guest@localhost' } })
  const subscriber = new taube.Subscriber({ key: 'amqp sync test' })
  await t.notThrowsAsync(() => subscriber.on(`test-error-handling`, () => {}))
})

test.after(async() => {
  await taube.shutdown()
})
