const config = require('./config')
const amqp = require('amqp-connection-manager')
const debug = require('debug')('taube-amqp')

let conn
let channels = []
let errorHandler = defaultErrorHandler

async function init(options = {}) {
  if (conn) return Promise.resolve(conn)
  const uri = options.uri || config.amqp.uri
  errorHandler = options.errorHandler || defaultErrorHandler

  if (!uri) {
    // eslint-disable-next-line max-len
    throw new Error('AMQP host URI needs to be defined either using init(uri) or TAUBE_AMQP_URI')
  }
  const connection = amqp.connect(uri, options)

  // Set to promise, so all other functions can await
  conn = new Promise((resolve, reject) => {
    let counter = 0
    const initialConnectionEventListener = ({ err }) => {
      counter++
      if (counter >= 3) {
        reject(err)
      }
    }
    connection.on('disconnect', initialConnectionEventListener)
    connection.on('connect', () => {
      debug('AMQP connected')
      connection.removeListener('disconnect', initialConnectionEventListener)
      resolve(connection)
    })
  })

  try {
    conn = await conn
  } catch (error) {
    conn = null
    throw error
  }

  return conn
}

// Internal API for tests
async function shutdownChannel(channel) {
  channel.removeAllListeners('error')
  channel.removeAllListeners('close')
  // Can fail in rare cases, where this function was called by tests before
  // as .close cannot be called multiple times
  await channel.close().catch(console.error)
}

async function shutdown() {
  await Promise.all(channels.map(channel => shutdownChannel(channel)))
  conn = null
  channels = []
}

// This function either returns a promise that can be awaited
// which will now or in the future contain an active connection
// or it fails if amqp has not been intialized
function connection() {
  if (conn) return Promise.resolve(conn)
  throw new Error('AMQP needs to be initialized before usage. See taube README.md')
}

// Get a channel to communicate to rabbitmq
//
// Also creates am exchange that is going to be used to
// publish the messages to all listening queues
//
// Exchange: https://www.rabbitmq.com/tutorials/amqp-concepts.html#amqp-model
// Channel: "lightweight connections that share a single TCP connection"
// For more information: https://www.rabbitmq.com/channels.html
async function channel() {
  const client = await connection()
  const channel = await client.createChannel()
  await channel.waitForConnect()
  channel.on('error', errorHandler)
  channel.on('close', errorHandler)
  channels.push(channel)
  return channel
}

// Private api only used to test channels
function getChannels() {
  return channels
}

// Private api
function getErrorHandler() {
  return errorHandler
}

function defaultErrorHandler(error) {
  if (error) throw error
  throw new Error('amqp issue: connection issue')
}

module.exports = {
  amqp,
  connection,
  shutdown,
  shutdownChannel,
  channel,
  getChannels,
  getErrorHandler,
  init
}
