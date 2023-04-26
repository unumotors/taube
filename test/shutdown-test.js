/**
 * This is a small app that tests the graceful shutdown behavior of Taube
 *
 * It cannot run as an ava test, because ava also listens for the SIGTERM/SIGINT
 * events and shuts down the tests when they occur.
 */

import { strict as assert } from 'node:assert'
// eslint-disable-next-line import/no-extraneous-dependencies
import mongoose from 'mongoose'
import taube from '../lib/index.js'
import consts from './helper/consts.js'

// Setup all connections
// AMQP
const amqpConnection = await taube.amqp.connection(consts.brokerUri)
await taube.amqp.channel({
  brokerUri: consts.brokerUri,
})
// HTTP
await taube.http.init()
// Mongoose
const mongoServer = process.env.MONGO_CONNECTION_STRING || 'localhost:27017'
await mongoose.connect(`mongodb://${mongoServer}`)

// Check for all connections to be open/setup
assert.equal(amqpConnection.isConnected(), true)
assert.equal(taube.http.server.listening, true)
assert.equal(mongoose.connection.readyState, 1 /* connected */)

// Send signal to trigger shutdown
process.kill(process.pid, 'SIGTERM')
// Wait for this to reach every listener
await new Promise((resolve) => { setTimeout(resolve, 2000) })

// check if all connections are closed
assert.equal(amqpConnection.isConnected(), false)
assert.equal(taube.http.server.listening, false)
assert.equal(mongoose.connection.readyState, 0 /* disconnected */)

process.exit(0) // all good
