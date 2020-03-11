const config = require('./config')
var amqp = require('amqplib')

let conn
let channels = []
let errorHandler = defaultErrorHandler

async function init(options = {}) {
  if (!config.amqp.enabled) return Promise.resolve()
  if (conn) return Promise.resolve(conn)
  const uri = options.uri || config.amqp.uri
  if (!uri) {
    // eslint-disable-next-line max-len
    throw new Error('AMQP host URI needs to be defined either using init(uri) or TAUBE_AMQP_URI')
  }
  const promise = amqp.connect(uri, options)
  // Set to promise, so all other functions can await
  conn = promise
  try {
    conn = await promise
  } catch (error) {
    conn = null
    throw error
  }

  // Passing an errorHandler is currently a private API
  errorHandler = options.errorHandler || defaultErrorHandler
  conn.on('error', errorHandler)
  conn.on('close', errorHandler)

  return conn
}

// Internal API for tests
async function shutdownChannel(channel) {
  channel.removeAllListeners('error')
  channel.removeAllListeners('close')
  // Can fail in rare cases, where this function was called by tests before
  // as .close cannot be called multiple times
  await channel.close().catch((e) => {
    console.error(e)
  })
}

async function shutdown() {
  await Promise.all(channels.map(channel => shutdownChannel(channel)))
  if (conn) {
    conn.removeAllListeners('error')
    conn.removeAllListeners('close')
  }
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
