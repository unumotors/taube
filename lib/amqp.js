import amqp, { AmqpConnectionManagerClass } from 'amqp-connection-manager'
import debugFactory from 'debug'
import config from './config/index.js'

const debug = debugFactory('taube-amqp')

const connections = {}
let channels = []

function defaultErrorHandler(error) {
  console.error(error)
  if (error) throw error
  throw new Error('amqp issue: connection issue')
}

let errorHandler = defaultErrorHandler

// Private api
function getErrorHandler() {
  return errorHandler
}

async function connection(uri, options = {}) {
  if (!uri) {
    // eslint-disable-next-line max-len
    throw new Error('Taube cannot initialize an AMQP connection as "uri" is missing.')
  }
  if (typeof uri != 'string') {
    // eslint-disable-next-line max-len
    throw new Error('Taube cannot initialize an AMQP connection as "uri" is not a string.')
  }
  if (connections[uri]) return Promise.resolve(connections[uri])

  errorHandler = options.errorHandler || defaultErrorHandler

  debug('AMQP connecting to ', uri)
  const manager = new AmqpConnectionManagerClass(uri, options)
  connections[uri] = manager.connect({ timeout: config.amqp.initialConnectionTimeout })
    .then(() => {
      debug('AMQP connected to ', uri)
      return manager
    })
    .catch((err) => {
      // Remove the connection, as it was never established
      delete connections[uri]
      getErrorHandler()(err)
    })

  connections[uri] = await connections[uri]
  return connections[uri]
}

// Internal API for tests
async function shutdownChannel(channelInstance) {
  channelInstance.removeAllListeners('error')
  channelInstance.removeAllListeners('close')
  // Can fail in rare cases, where this function was called by tests before
  // as .close cannot be called multiple times
  await channelInstance.close().catch(console.error)
}

async function shutdown() {
  await Promise.all(channels.map((channelInstance) => shutdownChannel(channelInstance)))
  for (const [key, conn] of Object.entries(connections)) {
    // shutdown if already intialized only, as this can be a promise
    if (conn?.constructor?.name == 'AmqpConnectionManager') {
      // eslint-disable-next-line no-underscore-dangle
      conn?._currentConnection?.connection?.close()
    }
    delete connections[key]
  }
  debug('Closed all channels and connections')
  channels = []
}

// Get a channel to communicate to rabbitmq
//
// Does initialize a connection to the broker if it does not exist yet
//
// Channel: "lightweight connections that share a single TCP connection"
// For more information: https://www.rabbitmq.com/channels.html
async function channel(options) {
  const client = await connection(options.brokerUri, options)
  const createdChannel = await client.createChannel()
  await createdChannel.waitForConnect()
  createdChannel.on('error', errorHandler)
  createdChannel.on('close', errorHandler)
  channels.push(createdChannel)
  return createdChannel
}

// Private api only used to test channels
function getChannels() {
  return channels
}

export default {
  amqp,
  connection,
  shutdown,
  shutdownChannel,
  channel,
  getChannels,
  getErrorHandler,
  _connections: connections, // for tests only

}
