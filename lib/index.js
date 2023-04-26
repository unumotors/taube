/* eslint-disable global-require */
/* eslint-disable no-underscore-dangle */

// Import everything to build a "taube" object for default export
import Joi from 'joi'
import Requester from './components/requester.js'
import Responder from './components/responder.js'
import monitoring from './helpers/monitoring.js'
import Sockend from './components/sockend.js'
import Publisher from './components/publisher.js'
import Subscriber from './components/subscriber.js'
import Worker from './components/worker.js'
import Queue from './components/queue.js'
import Errors from './components/errors.js'
import Client from './components/client.js'
import Server from './components/server.js'
import MockClient from './components/mocking.js'
import QueueWorkerExponentialRetries from './components/queue-worker-exponential-retries.js'

import http from './http.js'
import amqp from './amqp.js'
import mongoHelper from './helpers/mongo.js'

// Export all components as named
export { default as Joi } from 'joi'
export { default as Requester } from './components/requester.js'
export { default as Responder } from './components/responder.js'
export { default as monitoring } from './helpers/monitoring.js'
export { default as Sockend } from './components/sockend.js'
export { default as Publisher } from './components/publisher.js'
export { default as Subscriber } from './components/subscriber.js'
export { default as Worker } from './components/worker.js'
export { default as Queue } from './components/queue.js'
export { default as Errors } from './components/errors.js'
export { default as Client } from './components/client.js'
export { default as Server } from './components/server.js'
export { default as MockClient } from './components/mocking.js'
export { default as QueueWorkerExponentialRetries } from './components/queue-worker-exponential-retries.js'

export { default as http } from './http.js'
export { default as amqp } from './amqp.js'

export const shutdown = async() => {
  await http.shutdown()
  await amqp.shutdown()
  await mongoHelper.shutdown()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Build a default export to make migration to ESM easy
const taube = {
  Requester,
  Responder,
  monitoring,
  Sockend,
  Publisher,
  Subscriber,
  Worker,
  Queue,
  Errors,
  Client,
  Server,
  MockClient,
  QueueWorkerExponentialRetries,
  http,
  amqp,
  Joi,
  shutdown,
}

/**
 * Gracefully shutdown taube
 */
export default taube
