/* eslint-disable require-await */
/* eslint-disable global-require */
const test = require('ava')
const express = require('express')
const http = require('http')

process.env.TAUBE_HTTP_ENABLED = true
process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test

const taube = require('../lib')
const ioServer = require('socket.io')
const ioClient = require('socket.io-client')

let globalPort = 6000
let globalResponderNumber = 0

async function emit(client, event, data) {
  return new Promise((resolve, reject) => {
    if (!client) {
      reject(new Error('No socket connection.'))
    } else {
      client.once('error', function(err) {
        reject(err)
      })
      client.emit(event, data, (err, response) => {
        client.off('error')

        if (err) {
          reject(err)
        } else {
          resolve(response)
        }
      })
    }
  })
}


test.serial('sockend has id', async(t) => {
  const app = express()
  const server = http.createServer(app)
  const port = globalPort++
  const io = ioServer(server)

  // Wait for server to start
  await new Promise(resolve => {
    server.listen(port, function() {
      resolve()
    })
  })
  // Initialize sockend
  const sockend = new taube.Sockend(io)
  t.truthy(sockend.id)

  server.close()
})

test.serial('sockend readiness should work as expected', async(t) => {
  const app = express()
  const server = http.createServer(app)
  const port = globalPort++
  const io = ioServer(server)

  // Initialize sockend
  const sockend = new taube.Sockend(io)
  t.false(sockend.isReady(), 'should not be ready before sockend server is listening')
  // Wait for server to start
  await new Promise(resolve => {
    server.listen(port, function() {
      resolve()
    })
  })

  server.close()
})


test.serial('sockend should fail adding namespace if parameters are missing', async(t) => {
  const namespace = 'test-namespace-2'

  const app = express()
  const server = http.createServer(app)
  const port = globalPort++
  const io = ioServer(server)

  // Wait for server to start
  await new Promise(resolve => {
    server.listen(port, function() {
      resolve()
    })
  })

  // Initialize sockend
  const sockend = new taube.Sockend(io)
  await t.throwsAsync(sockend.addNamespace({}), 'options.namespace required')
  await t.throwsAsync(sockend.addNamespace({ namespace }), 'options.requester required')
  await t.throwsAsync(sockend.addNamespace({ namespace, requester: {} }), 'options.requester.uri required')

  server.close()
})


test.serial('sockend works with multiple namespaces', async(t) => {
  const responderKey1 = `sockend test responder ${globalResponderNumber++}`
  const responderKey2 = `sockend test responder ${globalResponderNumber++}`
  const type1 = 'sockend test return nothing - 1'
  const type2 = 'sockend test return nothing - 2'

  const namespace1 = 'test-namespace-1'
  const namespace2 = 'test-namespace-2'

  const responder1 = new taube.Responder({
    key: responderKey1,
    sockendWhitelist: [type1]
  })
  responder1.on(type1, async() => ({ number: 1 }))

  const responder2 = new taube.Responder({
    key: responderKey2,
    sockendWhitelist: [type2]
  })
  responder2.on(type2, async() => ({ number: 2 }))

  const app = express()
  const server = http.createServer(app)
  const port = globalPort++
  const io = ioServer(server)

  // Wait for server to start
  await new Promise(resolve => {
    server.listen(port, function() {
      resolve()
    })
  })

  // Initialize sockend
  const sockend = new taube.Sockend(io)
  await sockend.addNamespace({
    namespace: namespace1,
    requester: {
      uri: 'http://localhost',
      key: responderKey1
    }
  })

  // Should not be able to add the same namespace name
  try {
    await sockend.addNamespace({
      namespace: namespace1,
      requester: {
        uri: 'http://not-used'
      }
    })
  } catch (error) {
    t.is(error.message, 'Namespace test-namespace-1 already exists')
  }

  await sockend.addNamespace({
    namespace: namespace2,
    requester: {
      uri: 'http://localhost',
      key: responderKey2
    }
  })

  t.is(sockend.getNamespace(namespace1).namespace, namespace1, 'should be able to get namespace by namespace name')
  t.is(sockend.getNamespace(namespace2).namespace, namespace2, 'should be able to get namespace by namespace name')

  // Connect a socketio client to namespace1
  const client1 = ioClient.connect(`http://localhost:${port}/${namespace1}`)
  // Check if namespace 1 answers
  const res1 = await emit(client1, type1)
  t.deepEqual(res1, { number: 1 })

  // Connect a socketio client to namespace 2
  const client2 = ioClient.connect(`http://localhost:${port}/${namespace2}`)

  // Check if namespace 2 answers
  const res2 = await emit(client2, type2)
  t.deepEqual(res2, { number: 2 })

  server.close()
})

test.serial('sockend works with requesterTransformators', async(t) => {
  const responderKey = `sockend test responder ${globalResponderNumber++}`
  const type1 = 'sockend test return nothing 2'
  const namespace = 'test-namespace-2'

  const responder = new taube.Responder({
    key: responderKey,
    sockendWhitelist: [type1]
  })
  responder.on(type1, async(req) => req)

  const app = express()
  const server = http.createServer(app)
  const port = globalPort++
  const io = ioServer(server)

  // Wait for server to start
  await new Promise(resolve => {
    server.listen(port, function() {
      resolve()
    })
  })

  // Initialize sockend
  const sockend = new taube.Sockend(io)

  sockend.requesterTransformators.push(function(req, socket) {
    req.requesterTransformerIsExectuted = true
    if (socket) req.hasAccessToSocket = true
  })

  await sockend.addNamespace({
    namespace,
    requester: {
      uri: 'http://localhost',
      key: responderKey
    }
  })

  // Connect a socketio client
  const client = ioClient.connect(`http://localhost:${port}/${namespace}`)

  // Check empty message
  const res = await emit(client, type1)

  const response = {
    requesterTransformerIsExectuted: true,
    hasAccessToSocket: true,
    type: 'sockend test return nothing 2'
  }
  t.deepEqual(response, res)

  server.close()
})

test.serial('sockend works with requests and errors', async(t) => {
  const responderKey = `sockend test responder ${globalResponderNumber++}`
  const type1 = 'sockend test return nothing'
  const type2 = 'sockend test return request'
  const type3 = 'sockend test return error'

  const response = { response: 'sockend test 1' }
  const namespace = 'test-namespace'
  const errorResponseMessage = 'sockend test error message'

  const responder = new taube.Responder({
    key: responderKey,
    sockendWhitelist: [type1, type2, type3]
  })
  responder.on(type1, async() => await response)
  responder.on(type2, async(req) => {
    const res = req
    delete req.type
    return res
  })
  responder.on(type3, async() => {
    throw new Error(errorResponseMessage)
  })
  const app = express()
  const server = http.createServer(app)
  const port = globalPort++
  const io = ioServer(server)

  // Wait for server to start
  await new Promise(resolve => {
    server.listen(port, function() {
      resolve()
    })
  })

  // Initialize sockend
  const sockend = new taube.Sockend(io)
  await sockend.addNamespace({
    namespace,
    requester: {
      uri: 'http://localhost',
      key: responderKey
    }
  })

  // Connect a socketio client
  const client = ioClient.connect(`http://localhost:${port}/${namespace}`)

  // Check empty message
  const res = await emit(client, type1)
  t.deepEqual(res, response)

  const testPackage = {
    test: {
      test: {
        bla: 'bla'
      }
    }
  }

  // Works with data
  const res2 = await emit(client, type2, testPackage)
  t.deepEqual(res2, testPackage)

  // Works with error
  try {
    await emit(client, type3, {})
    t.fail('Should have received an error')
  } catch (error) {
    t.is(error.message, errorResponseMessage)
  }

  // Sending unknown topic results in error event
  try {
    await emit(client, 'unknown')
    t.fail('Should have received an error')
  } catch (error) {
    t.is(error, 'Not Found')
  }

  server.close()
})


test.serial('sockend only works with whitelisted endpoints', async(t) => {
  const responderKey = `sockend test responder ${globalResponderNumber++}`
  const type1 = 'sockend should fail this'
  const namespace = 'test-namespace-whitelist'

  const responder = new taube.Responder({
    key: responderKey,
    sockendWhitelist: []
  })
  responder.on(type1, async() => ({}))

  const app = express()
  const server = http.createServer(app)
  const port = globalPort++
  const io = ioServer(server)

  // Wait for server to start
  await new Promise(resolve => {
    server.listen(port, function() {
      resolve()
    })
  })

  // Initialize sockend
  const sockend = new taube.Sockend(io)
  await sockend.addNamespace({
    namespace,
    requester: {
      uri: 'http://localhost',
      key: responderKey
    }
  })

  // Connect a socketio client
  const client = ioClient.connect(`http://localhost:${port}/${namespace}`)

  // Check empty message
  try {
    await emit(client, type1)
    t.fail('Should have failed non whitelisted endpoint')
  } catch (error) {
    t.is(error.name, 'ForbiddenError')
  }

  server.close()
})

test.serial('sockend can pass responder port', async(t) => {
  const responderKey = `sockend test responder ${globalResponderNumber++}`
  const type1 = 'sockend test return nothing'

  const response = { response: 'sockend test 1' }
  const namespace = 'test-namespace'

  const responder = new taube.Responder({
    key: responderKey,
    sockendWhitelist: [type1]
  })
  responder.on(type1, async() => await response)

  const app = express()
  const server = http.createServer(app)
  const port = globalPort++
  const io = ioServer(server)

  // Wait for server to start
  await new Promise(resolve => {
    server.listen(port, function() {
      resolve()
    })
  })

  // Initialize sockend
  const sockend = new taube.Sockend(io)
  await sockend.addNamespace({
    namespace,
    requester: {
      uri: 'http://localhost',
      key: responderKey,
      port: 4321
    }
  })

  // Connect a socketio client
  const client = ioClient.connect(`http://localhost:${port}/${namespace}`)


  // Check empty message
  const res = await emit(client, type1)
  t.deepEqual(res, response)

  server.close()
})

test.serial('sockend works with custom socket handlers that have been allowed', async(t) => {
  const namespace = 'custom-handler'
  const responderKey = `sockend test responder ${globalResponderNumber++}`

  // eslint-disable-next-line no-unused-vars
  const responder = new taube.Responder({
    key: responderKey,
    sockendWhitelist: ['not-used']
  })

  const app = express()
  const server = http.createServer(app)
  const port = globalPort++
  const io = ioServer(server)

  // Wait for server to start
  await new Promise(resolve => {
    server.listen(port, function() {
      resolve()
    })
  })

  // Initialize sockend
  const sockend = new taube.Sockend(io)
  const ns = await sockend.addNamespace({
    namespace,
    requester: {
      uri: 'http://localhost',
      key: responderKey
    }
  })

  t.throws(() => ns.allowTopic(), 'Parameter topic required.')
  ns.allowTopic('data')

  const socketNamespace = io.of(`/${namespace}`)
  socketNamespace.on('connection', function(socket) {
    socket.on('data', (data, cb) => {
      cb(null, { data })
    })
  })

  // Connect a socketio client
  const client = ioClient.connect(`http://localhost:${port}/${namespace}`)

  // Sending allowed topic should work
  const data = 'custom data'
  const res = await emit(client, 'data', data)
  t.is(res.data, data)
  server.close()
})

test.serial('sockend should throw "not found" on uninitialized requesters', async(t) => {
  const namespace = 'test-namespace-3'
  const responderKey = `sockend test responder ${globalResponderNumber++}`
  const type1 = 'sockend test return nothing'
  const response = { response: 'sockend test 1' }


  const app = express()
  const server = http.createServer(app)
  const port = globalPort++
  const io = ioServer(server)

  // Initialize sockend
  const sockend = new taube.Sockend(io, { name: 'test' })
  // Wait for server to start
  await new Promise(resolve => {
    server.listen(port, function() {
      resolve()
    })
  })

  // Connect a socketio client
  const client = ioClient.connect(`http://localhost:${port}/${namespace}`)

  sockend.addNamespace({
    namespace,
    requester: {
      uri: 'http://localhost',
      key: responderKey
    }
  })

  try {
    await emit(client, type1)
  } catch (error) {
    t.is(error, 'Not Found')
  }

  const responder = new taube.Responder({
    key: responderKey,
    sockendWhitelist: [type1]
  })
  responder.on(type1, async() => await response)

  // Wait for the responder to answer. This test requires ava to have a timeout
  await new Promise((resolve) => {
    const interval = setInterval(async() => {
      try {
        await emit(client, type1)
        clearInterval(interval)
        resolve()
      } catch (err) {
        t.is(err, 'Not Found')
      }
    }, 1000)
  })

  // Check message
  const res = await emit(client, type1)
  t.deepEqual(res, response)

  server.close()
})

test.serial('sockend should throw "Internal Server Error" if there is a non http issue', async(t) => {
  const namespace = 'test-namespace-3'
  const responderKey = `sockend test responder ${globalResponderNumber++}`
  const type1 = 'sockend test return nothing'

  const app = express()
  const server = http.createServer(app)
  const port = globalPort++
  const io = ioServer(server)

  // Initialize sockend
  const sockend = new taube.Sockend(io)
  // Wait for server to start
  await new Promise(resolve => {
    server.listen(port, function() {
      resolve()
    })
  })

  // Connect a socketio client
  const client = ioClient.connect(`http://localhost:${port}/${namespace}`)
  sockend.addNamespace({
    namespace,
    requester: {
      uri: 'http://localhost',
      key: responderKey
    }
  })

  // Should throw InternalServerError when non http code error happens
  sockend.getNamespace(namespace).requester.sendWithOptions = async() => {
    throw new Error()
  }
  try {
    await emit(client, type1)
  } catch (error) {
    t.is(error, 'Internal Server Error')
  }

  server.close()
})

test.serial('sockend namespace and socket middlewares work', async(t) => {
  const namespace = 'test-namespace-3'
  const responderKey = `sockend test responder ${globalResponderNumber++}`
  const type1 = 'sockend test return nothing'
  const sendData = { bla: 'bla' }
  const app = express()
  const server = http.createServer(app)
  const port = globalPort++
  const io = ioServer(server)

  t.plan(5)

  // Initialize sockend
  const sockend = new taube.Sockend(io)
  // Wait for server to start
  await new Promise(resolve => {
    server.listen(port, function() {
      resolve()
    })
  })

  // Connect a socketio client
  const taubeNamespace = await sockend.addNamespace({
    namespace,
    requester: {
      uri: 'http://localhost',
      key: responderKey
    }
  })
  // Add a namespace middleware
  function namespaceMiddleware(socket, next) {
    t.truthy(socket)
    next()
  }
  taubeNamespace.namespaceUse(namespaceMiddleware)
  t.throws(taubeNamespace.namespaceUse, 'Parameter fn required.')

  // Add a per socket middleware
  function socketMiddleware(packet, next) {
    const [type, data] = packet
    t.is(type, type1)
    t.deepEqual(data, sendData)
    next()
  }
  taubeNamespace.socketUse(socketMiddleware)
  t.throws(taubeNamespace.socketUse, 'Parameter fn required.')


  const client = ioClient.connect(`http://localhost:${port}/${namespace}`)

  // Send something so the middlewares are called
  try {
    await emit(client, type1, sendData)
  } catch (error) {}

  server.close()
})
