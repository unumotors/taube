/* eslint-disable no-underscore-dangle */
const express = require('express')
const config = require('./config')
const http = require('http')

const { errors } = require('celebrate')

// Setup express
const app = express()
app.use(express.json({ limit: config.http.limit }))

app.use(errors())
// Mark the celebrate error handler, so we can move it later
app._router.stack[app._router.stack.length - 1]._isCelebrateErrorHandler = true

const server = http.createServer(app)

function ensureErrorHandlingMiddlewareIsLast() {
  const index = app._router.stack.findIndex(router => router._isCelebrateErrorHandler)
  app._router.stack.push(app._router.stack.splice(index, 1)[0])
}

let startingPromise

// eslint-disable-next-line require-await
async function listen() {
  if (startingPromise) return startingPromise

  // Find an open port in testing
  // Ref: https://nodejs.org/docs/latest-v14.x/api/net.html#net_server_listen_port_host_backlog_callback
  const port = config.testing ? 0 : config.http.port

  // Wrapping this in a promise enables us to await listen() in tests
  startingPromise = new Promise(resolve => {
    server.listen(port, () => {
      const assignedPort = server.address().port
      console.log('Taube running on port', assignedPort)
      if (config.testing) {
        // make sure in testing that the Requesters
        // get the correct port from the shared config
        config.http.port = assignedPort
      }

      resolve()
      startingPromise = Promise.resolve()
    })
  })
  return startingPromise
}

listen()

function getPort() {
  return server.address().port
}

module.exports = {
  server,
  getPort,
  app,
  listen,
  ensureErrorHandlingMiddlewareIsLast
}
