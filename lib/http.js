const express = require('express')
const config = require('./config')
const getPort = require('get-port')
const debug = require('debug')('taube-http')
const http = require('http')

// Setup express
const app = express()
app.use(express.json())
const server = http.createServer(app)

let port

async function listen() {
  if (!config.testing) {
    // eslint-disable-next-line prefer-destructuring
    port = config.http.port
    debug('Running on port', port)
    return server.listen(config.http.port)
  }
  // Find an open port in testing
  port = await getPort()
  debug('Detected testing env (NODE_ENV=test). Running on port', port)
  server.listen(port)
  return server
}

listen()

module.exports.server = server
module.exports.getPort = () => port
module.exports.app = app
