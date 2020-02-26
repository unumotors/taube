# 🕊 Taube

Taube is a pigeon in German. This comes from the idea that we use carrier pigeons to transfer our data.

Replaces cotes communication layer with http. This has been inspired by cote as a migration path, but will branch out and diverge from the core cote system.
Taube aims to leverage existing tooling as much as possible such as DNS and service discovery from an external provider as well as leverage existing transfer protocols that are well supported and maintained.

Taube is a drop in replacement for cote. Without configuration it functions as a wrapper to cote and keeps using cote for communication. It also sets up http Responders, which means the service using Taube can be targeted by Taube Requesters.

## Table of Contents

1. [Quick start guide](##Quick-start-guide)
2. [Environment variables](#Environment-variables)
3. [Migrate from cote](#Migrate-from-cote)
4. [Readiness](#Readiness)
5. [Sockend](#Sockend)
6. [Writing unit tests](#Writing-unit-tests)

## Quick start guide

### Responders

```javascript
const taube = require('@cloud/taube')

const responder = new taube.Responder({
  key: 'users'
})

responder.on('get user', async({ prop1, prop2 }) => {
  return 'Bob'
})
```

#### Responder Options

| Property         | Default   | Required | Description
| ---------------- |:---------:|:--------:| ---
| key              | 'default' | no       | The key of the responder, separates multiple Responders on the same service
| port             | 4321      | no       | Port of Responder in case of non default port
| sockendWhitelist | []        | no       | What endpoints to expose using Sockend component. See Sockend component docs.
| coteEnabled | undefined | no | Can be used to overwrite the global TAUBE_COTE_DISABLED setting per Responder

### Requesters

In order to activate HTTP for all Taube Requesters in a service you need to provide `TAUBE_HTTP_ENABLED=true` (if you are using it in a service inside stack, then this is already turned on).

```javascript
const taube = require('@cloud/taube')

// Creating the requester needs to be one of the first things in your application
// Assuming that a Responder with the given key is set up on the given uri
const requester = new taube.Requester({
  uri: 'http://localhost',
  key: 'users'
})

const res = await requester.send({
  type: 'get user',
  prop1: 'asd',
  prop2: 'asd'
})
```

#### Requester Options

| Property | Default   | Required | Description
| -------- |:---------:|:--------:| ---
| uri      | none      | yes      | URI of the corresponding Responder
| key      | 'default' | no       | The key of the Responder
| port     | 4321      | no       | Port of Responder in case of non default port
| coteEnabled | undefined | no | Can be used to overwrite the global TAUBE_COTE_DISABLED setting per Requester

The `url` option needs to include `http` or `https` without a `/` at the end.

- In Kubernetes the `uri` would be the name of the service (if in the same namespace) or the [full dns](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/) (if not in the same namespace).
- In docker-compose the `uri` would be the service name.

## Environment variables

| Variable           | Default          | Description
| ------------------ |:----------------:| ---
| TAUBE_HTTP_ENABLED | undefined / true | If set Taube will use HTTP instead of cote (axion). Set to true inside stack services.
| TAUBE_HTTP_PORT    | 4321             | Port of http server
| TAUBE_HTTP_DEBUG   | undefined        | Adds debugging information to Taube (e.g. Boolean usedHttp to requesters send() responses)
| TAUBE_UNIT_TESTS   | undefined        | If set all requesters default their uri to <http://localhost>
| TAUBE_RETRIES | 3 | Number of retries any Requester does before giving up. 3 is maximum value as retry duration would be over timeout.
| TAUBE_COTE_DISABLED | undefined | If set, taube will not create cote components for responders and requesters


## Migrate from cote

The following is a proposed migration path:

1. Replace all `require('cote')` with `require('@cloud/taube')`
2. Make sure your tests pass
3. Pick a service
4. Make sure it has a resolvable dns (e.g. add a Kubernetes service to it)
5. Add the environment variable TAUBE_HTTP_ENABLED=true to the service
6. Make sure your tests pass
7. Go to 3 until no more services

## Readiness

@infrastructure/observability can be used to get readiness checks for the taube http server.

```javascript
const observability = require('@infrastructure/observability')

observability.monitoring.addReadinessCheck(taube.monitoring.readinessCheck)
```

## Sockend

The Sockend component creates a socket.io server that exposes a Requesters endpoints. It only exposes endpoints that have been exposed using the Responders `sockendWhitelist` property.

You need a Responder setup for Sockend usage by defining its `sockendWhitelist` property with the endpoints you would like to expose:

```javascript
const taube = require('@cloud/taube')

const userResponder = new taube.Responder({
  key: 'users',
  // All endpoints that should be exposed by the Sockend need an entry here
  sockendWhitelist: ['login']
})

userResponder.on('login', async(req) => {
  // ...
})
```

The Sockend component can then be used (for example in another server in the same network) to expose all endpoints defined by `sockendWhitelist` on a socket.io server:

```javascript
// Setup the underlying socket.io server
const port = 6000
const app = express()
const server = http.createServer(app)
const io = ioServer(server)

async function main() {
  const sockend = new taube.Sockend(io)
  await sockend.addNamespace({
    // This is the actual namespace name. So a socket.io client would connect to
    // http://localhost/users
    namespace: 'users',
    requester: {
      // URI of the Responder host
      uri: 'http://localhost',
      // Key of the corresponding Responder
      key: 'users'
    }
  })
  return sockend
}

main().catch(err => {
  console.error('Error initializing Sockend', err)
  process.exit(1)
}).then(sockend => {
  console.log('Sockend status', sockend.isReady())
})
```

Multiple namespaces can be added to a single Sockend instance by calling `sockend.addNamespace({})` multiple times.

You may get a namespace by using the `getNamespace('name')` function of the Sockend component.

The sockend component exposes a `isReady()` function to check if all namespaces are ready. This can be used for readiness checks.

Sockend options:

| Property        | Default   | Required | Description
| --------------- |:---------:|:--------:| ---
| namespace       | none      | yes      | Namespace name. e.g. 'users' results in <http://0.0.0.0/users>
| requester.key   | 'default' | yes      | The key of the corresponding responder
| requester.uri   | 'default' | yes      | The URI of the responder
| requester.port  | 4321      | no       | Port of Responder in case of non default

### Namespace and socket middleware

Taube supports the addition of socket.io style middleware to either the namespace or to individual socket connections.

Namespace functions `namespaceUse` and `socketUse` may be used. You can **not** directly modify the socket.io namespaces using native socket.io functionality.

```javascript
// Add a namespace middleware (for example for auth)
function namespaceMiddleware(socket, next) {
  const { handshake } = socket
  next()
}
taubeNamespace.namespaceUse(namespaceMiddleware)

// Add a per socket middleware
function socketMiddleware(packet, next) {
  const [type, data] = packet
  // Do things
  next()
}
taubeNamespace.socketUse(socketMiddleware)
```

### Custom event listeners

You may want to add a custom event listener to specific socket.io topics. This is useful when not dealing with object based messages (e.g. using a text based protocol).

You may add these using the `allowTopic` function of namespaces.

```javascript
const ns = await sockend.addNamespace({
    namespace,
    requester: {
      uri: 'http://localhost',
      key: responderKey
    }
  })
// Alternatively use to get a namespace by name
// const ns = sockend.getNamespace(namespace)
ns.allowTopic('data')

const socketNamespace = io.of(`/${namespace}`)
socketNamespace.on('connection', function(socket) {
  socket.on('data', (data, cb) => {
    cb(null, { data })
  })
})
```

The Sockend component will not process any events of the 'data' event type and leave the process up to the custom handler.

## Writing unit tests

taube auto detects running in `NODE_ENV=test` and overwrites all requesters with `uri` = `http://localhost`. This means all Responders can easily be mocked. See `test/unit-test.test.js` for an example. It also uses a random port then which ensures that all Requesters and Responders in a process can only contact each other.

You can also force this by setting `TAUBE_UNIT_TESTS`
