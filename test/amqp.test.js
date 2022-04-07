/* eslint-disable no-underscore-dangle */
const test = require('ava')
const MQTT = require('async-mqtt')
const consts = require('./helper/consts')
const taube = require('../lib')

process.env.TAUBE_UNIT_TESTS = true

test.afterEach(async() => {
  await taube.amqp.shutdown()
})

test.serial('throws if amqp cannot connect', async(t) => {
  const err = await t.throwsAsync(() => taube.amqp.connection('amqp://invalid-uri'))
  // This test needs to pass for both node version
  t.true(err.code == 'EAI_AGAIN' // Node 16+
    || err.code == 'ENOTFOUND') // Node 14
})

test.serial('connection() throws if parameters are wrong', async(t) => {
  await t.throwsAsync(() => taube.amqp.connection(), {
    message: 'Taube cannot initialize an AMQP connection as "uri" is missing.',
  })
  await t.throwsAsync(() => taube.amqp.connection({}), {
    message: 'Taube cannot initialize an AMQP connection as "uri" is not a string.',
  })
})

test.serial('channel error handling works as expected', async(t) => {
  await taube.amqp.connection(consts.brokerUri)
  const key = 'test-key-error-handling'
  const subscriber = new taube.Subscriber({ key, brokerUri: consts.brokerUri })
  await subscriber.on('test-error-handling', () => {})
  const { channel } = subscriber
  t.throws(() => channel.emit('error', new Error('test2')), { message: 'test2' })
  t.throws(() => channel.emit('close', new Error('test2')), { message: 'test2' })
  t.throws(() => channel.emit('error'), { message: 'amqp issue: connection issue' })
  t.throws(() => channel.emit('close'), { message: 'amqp issue: connection issue' })
  await taube.shutdown()
})

test.serial('taube closes all amqp channels when shutdown is called', async(t) => {
  await taube.amqp.connection(consts.brokerUri)
  const subscriber = new taube.Subscriber({ key: 'shutdown test', brokerUri: consts.brokerUri })
  await subscriber.on('a', () => {})
  t.is(taube.amqp.getChannels().length, 1)

  taube.amqp._connections.test = {} // This adds an invalid entry that shutdown() should be able to do

  await taube.shutdown()
  t.is(taube.amqp.getChannels().length, 0)
  // eslint-disable-next-line no-underscore-dangle
  t.deepEqual(taube.amqp._connections, {})
})

test.serial('taube can handle already closed channels gracefully', async(t) => {
  await taube.amqp.connection(consts.brokerUri)
  const channel = await taube.amqp.channel({ brokerUri: consts.brokerUri })
  // eslint-disable-next-line no-underscore-dangle
  channel._channel.close()
  await t.notThrowsAsync(async() => {
    await taube.amqp.shutdownChannel(channel)
  })
})

test.serial('can connect to multiple brokers', async(t) => {
  await taube.amqp.connection(consts.brokerUri)
  t.truthy(taube.amqp._connections[consts.brokerUri])
  // This is technically the same broker, but it is a seperate connection, as the uri is different
  // It is very hard to setup two RabbitMQ instances in CI
  await taube.amqp.connection(consts.secondBrokerUri)
  t.truthy(taube.amqp._connections[consts.secondBrokerUri])

  await taube.amqp.connection(consts.secondBrokerUri)
  await taube.amqp.connection(consts.brokerUri)
  t.is(Object.keys(taube.amqp._connections).length, 2, 'should reuse connections and not setup a new one')
})

test.serial('can get direct access to to a channel and publish to a MQTT client', async(t) => {
  const channel = await taube.amqp.channel({
    brokerUri: consts.brokerUri,
  })

  const mqttOptions = {
    host: consts.mqttHost,
    port: 1883,
    protocol: 'mqtt', // no tls
    username: 'guest',
    password: 'guest',
  }

  const mqttClient = await MQTT.connectAsync(mqttOptions)
  await mqttClient.subscribe('/2G/Rx/IMEI12345', { qos: 1 })

  let resolve
  const promise = new Promise((res) => { resolve = res })
  mqttClient.on('message', (topic, message) => {
    resolve({ topic, message })
  })

  await channel.publish('amq.topic', '.2G.Rx.IMEI12345', Buffer.from('test'))

  const { topic, message } = await promise
  t.is(topic, '/2G/Rx/IMEI12345')
  t.is(message.toString(), 'test')
})
