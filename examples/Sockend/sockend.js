const express = require('express')
const http = require('http')
// eslint-disable-next-line import/no-extraneous-dependencies
const ioServer = require('socket.io')
const taube = require('../../lib')

// Setup the underlying socket.io server
const port = 6000
const app = express()
const server = http.createServer(app)
const io = ioServer(server)

taube.http.init()

async function main() {
  // Wait for server to listen
  await new Promise((resolve) => {
    server.listen(port, () => {
      resolve()
    })
  })

  // Initialize sockend
  const sockend = new taube.Sockend(io)
  await sockend.addNamespace({
    // This is the actual namespace name. So a socket.io client would connect to
    // http://localhost/users
    namespace: 'users',
    requester: {
      // URI of the Responder host
      uri: 'http://localhost',
      // Key of the corresponding Responder
      key: 'users',
    },
  })
  return sockend
}

main().catch((err) => {
  console.error('Error initializing Sockend', err)
  process.exit(1)
}).then((sockend) => {
  console.log('Sockend status', sockend.isReady())
})
