# 🕊 Taube

Taube is a pigeon in German. This comes from the idea that we use carrier pigeons to transfer our data.

Taube aims to leverage existing tooling as much as possible such as DNS and service discovery from an external provider as well as leverage existing transfer protocols that are well supported and maintained.

## Table of Contents

1. [Quick start guide](##Quick-start-guide)
2. [Environment variables](#Environment-variables)
3. [Monitoring and Signal Handling](#Monitoring-and-Signal-Handling)
4. [Sockend](#Sockend)
5. [Publisher/Subscriber](#Publisher/Subscriber)
6. [Errors](#Errors)
7. [Writing unit tests](#Writing-unit-tests)
8. [Migrate from cote](#Migrate-from-cote)


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

### Requesters

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

The `url` option needs to include `http` or `https` without a `/` at the end.

- In Kubernetes the `uri` would be the name of the service (if in the same namespace) or the [full dns](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/) (if not in the same namespace).
- In docker-compose the `uri` would be the service name.

## Environment variables

| Variable           | Default          | Description
| ------------------ |:----------------:| ---
| TAUBE_HTTP_PORT    | 4321             | Port of http server
| TAUBE_DEBUG   | undefined        | Adds debugging information to Taube responses. See tests for usage. This does change responses and is only designed for development.
| TAUBE_UNIT_TESTS   | undefined        | If set all requesters default their uri to <http://localhost>
| TAUBE_RETRIES | 3 | Number of retries any Requester does before giving up. 3 is maximum value as retry duration would be over timeout.
| TAUBE_AMQP_URI | undefined | AMQP uri (e.g. 'amqp://guest:guest@localhost')

## Monitoring and Signal Handling

@infrastructure/observability can be used to get readiness/liveness checks and signal handling for the taube http server.

```javascript
const observability = require('@infrastructure/observability')

observability.monitoring.observeServer(taube.http.server, taube.http.app)
```

In order to gracefully handle Signal Handling and add liveness/readyness checks for AMQP, the following code can be used

```javascript
const observability = require('@infrastructure/observability')

observability.monitoring.addOnSignalHook(taube.shutdown)
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

## Publisher/Subscriber

The Publisher/Subscriber components can be used to connect to a AMQP enabled message broker. They provide the Publisher/Subscriber pattern to taube users.

To use these features you need to explicitly connect taube to a AMQP enabled message broker (e.g. RabbitMQ) using `taube.init()`. `taube.init()` can be called multiple times. It only has an affect once.

Taube does handle reconnecting to RabbitMQ through a library. All requests during a connection outage are saved in memory and will be flushed after reconnecting. There is no timeout for this, it will save messages indefinitely.

```
// Set TAUBE_AMQP_URI environment variable through your orchestration
taube.init()
// or pass directly
taube.init({ amqp: { uri: process.env.TAUBE_AMQP_URI }})
```

A subscriber can be setup to listen to all events of a topic type:

```
const userSubscriber = new taube.Subscriber({ key: 'users' })

userSubscriber.on('users updated', async(data) => {
  try {
    console.log(data)
  } catch(err) {
    // Handle your errors or you will get unhandled rejections
  }
})
```

A Publisher is used to publish the corresponding events:

```
const publisher = new taube.Publisher({ key: 'users' })

publisher.publish(`users updated`, { data: {} })
```

Every Publisher/Subscriber creates a Channel to RabbitMQ. There is a maximum number of channels per connection which is defined by your RabbitMQ [configuration](https://www.rabbitmq.com/configure.html). The default is 2047 per connection.

## Technical implementation details

Overview of the process between Publisher and Subscriber including the RabbitMQ concepts

```
+-----------------------+-------------------------------------------+--------------------------+
|     Taube             |                RabbitMQ                   |            Taube         |
|                       |                                           |                          |
|                       |                                           |                          |
|                       |                      +---------------+    |     +------------------+ |
|                       |            topic a   |temporary queue| channel  | taube Subscriber | |
|                       |          +---------->+     -key      +----+---->+      -key        | |
|                       |          |           |     -topic a  |    |     +------------------+ |
| +---------------+  channel   +---+----+      +---------------+    |                          |
| |taube Publisher+-----+----->+exchange|                           |                          |
| +---------------+     |      |  -key  |                           |                          |
|                       |      +---+----+                           |                          |
|                       |          |                                |                          |
|                       |          |           +---------------+ channel  +------------------+ |
|                       |          +---------->+temporary queue+----+---->+ taube Subscriber | |
|                       |            topic b   |     -key      |    |     |      -key        | |
|                       |            topic a   |     -topic b  |    |     +------------------+ |
|                       |                      |     -topic a  |    |                          |
|                       |                      +---------------+    |                          |
|                       |                                           |                          |
+-----------------------+-------------------------------------------+--------------------------+
```

Concepts:

- exchange: An exchange is the place where the Publishers send their messages. Queues can "listen" on exchanges
- queue: A queue of messages that listens on an exchange. In Pub/Sub we use non persistant, non worker queues
- channels: Multiple lightweight connections that share a single TCP connection between a process and RabbitMQ

Process:

After both the Publisher and Subscriber have registered their components a publish works like this:

1. Publisher sends message to exchange
2. Exchange sends message too all queues that listen to that key and topic (key and route called in RabbitMQ)
3. All queues trigger their consumers (listeners), which in this case is the taube Subscriber

## Errors

Errors component can be used to throw an error with proper HTTP statusCode.

This can handle all kinds of HTTP 4XX and 5XX errors.

To use this module, you need to import `Errors` module from taube and use the proper error constructor or statusCode.

### new Errors\[constructorName || statusCode\] \(\[message, data\]\)

Create a new error object with the given error message.

* `constructorName` : [constructor name](###List-of-all-constructors) of error
* `statusCode` : the stautsCode which is Number

| Parameters | Default   | Required | Type     | Description
| ---------- |:---------:|:--------:|:--------:|-----------
| message    | none      | no       | string   | * Customized error messages
| data       | none      | no       | any type | * Extra error data<br> * Usually, it is filled with object type of validation error data

And there are two ways of throwing a taube error instance.

#### Throwing an error using constructor name

```javascript
const { Errors } = require('@cloud/taube')

// joi/celebrate validation error
if(VALIDATION_FAILURE) {
  const message = 'validation failed'
  const data = { validation: '"scooterVin" is required'}  // validation failure message from joi/celebrate
  throw new Errors.BadRequest(message, data)
}
```

#### Throwing an error using statusCode

```javascript
const { Errors } = require('@cloud/taube')

// your code
if(!scooter) {
  const message = 'validation failed'
  const data = { validation: '"scooterVin" is required'}
  throw new Errors[400](message, data)
}
```

And the requester will receive an error like below.

```javascript
function errorHandler(err, req, res, next) {
  const { name, statusCode, message, data } = err
  // name: BadRequest
  // statusCode: 400
  // message: 'validation failed'
  // data: { validation: '"scooterVin" is required'}
}
```

You can find more example codes from the example/Errors folder.

### List of all constructors

| Constructor name | statusCode
| :--------------: | -----------
| BadRequest       | 400
| Unauthorized     | 401
| PaymentRequired  | 402
| Forbidden        | 403
| NotFound | 404
| MethodNotAllowed | 405
| NotAcceptable | 406
| ProxyAuthenticationRequired | 407
| RequestTimeout | 408
| Conflict | 409
| Gone | 410
| LengthRequired | 411
| PreconditionFailed | 412
| PayloadTooLarge | 413
| URITooLong | 414
| UnsupportedMediaType | 415
| RangeNotSatisfiable | 416
| ExpectationFailed | 417
| ImATeapot | 418
| MisdirectedRequest | 421
| UnprocessableEntity | 422
| Locked | 423
| FailedDependency | 424
| UnorderedCollection | 425
| UpgradeRequired | 426
| PreconditionRequired | 428
| TooManyRequests | 429
| RequestHeaderFieldsTooLarge | 431
| UnavailableForLegalReasons | 451
| InternalServerError | 500
| NotImplemented | 501
| BadGateway | 502
| ServiceUnavailable | 503
| GatewayTimeout | 504
| HTTPVersionNotSupported | 505
| VariantAlsoNegotiates | 506
| InsufficientStorage | 507
| LoopDetected | 508
| BandwidthLimitExceeded | 509
| NotExtended | 510
| NetworkAuthenticationRequired | 511


## Writing unit tests for projects using taube

Currently does not support Publisher/Subscriber unit testing. Those unit tests will require a usable AMQP message broker connection initialized using `taube.init()`. You will need to call `taube.shutdown()` in

taube auto detects running in `NODE_ENV=test` and overwrites all requesters with `uri` = `http://localhost`. This means all Responders can easily be mocked. See `test/unit-test.test.js` for an example. It also uses a random port then which ensures that all Requesters and Responders in a process can only contact each other.

You can also force this by setting `TAUBE_UNIT_TESTS`

## Contributing to the taube project

In order to run the unit tests, you need to run `docker-compose up` inside `.test/`. Then run `npm run test-verbose` to run the unit tests.

This project has a unit test line coverage of 100% and everything below that fails the ci jobs.

## Migrate from cote

Version 0.X is designed to have a clear migration path to remove cote. Taube 0.X is a drop in replacement for cote. Without configuration it functions as a wrapper to cote and keeps using cote for communication. It also sets up http Responders, which means the service using Taube can be targeted by Taube Requesters.

There is 3 modes you can run taube in while migrating from cote to taube.

1. Mode 1: Still use cote. Requesters/Responders and Publisher/Subscribers still use cote for communication
2. Mode 2: Use taube, but still provide cote. Requesters will use HTTP and Subscribers AMQP. But Responders will still provide cote and Publishers will still publish using cote.
3. Mode 3: Disable cote. cote components will no longer be created.

These settings can be tuned per component type:

|  Type  |  Mode 1  | Mode 2 | Mode 3
|:---:|:---:|:---:|:---:|
| Requesters/Responders | by default | TAUBE_HTTP_ENABLED | TAUBE_COTE_DISABLED + TAUBE_HTTP_ENABLED
| Publisher/Subscriber  | by default | TAUBE_AMQP_ENABLED | TAUBE_AMQP_COTE_DISABLED + TAUBE_AMQP_ENABLED

The following is a proposed migration path:

1. Replace all `require('cote')` with `require('@cloud/taube')`
2. Make sure your tests pass
3. Pick a service
4. Make sure it has a resolvable dns (e.g. add a Kubernetes service to it)
5. Enable the taube services you want to use selectively. It is prefferable to activate one of the two options per iteration.
    1. For Requester/Responder HTTP: Add the environment variable TAUBE_HTTP_ENABLED=true to the service
    2. For AMQP Publisher/Subscribers: Initialize amqp pub/sub using the method described in [Publisher/Subscriber](#Publisher/Subscriber)
6. Make sure your tests pass
7. Go to 3 until no more services

### Additional Environment Variables

| Variable           | Default          | Description
| ------------------ |:----------------:| ---
| TAUBE_HTTP_ENABLED | undefined / true | If set Taube will use HTTP instead of cote (axion). Set to true inside stack services.
| TAUBE_COTE_DISABLED | undefined | If set, taube will not create cote components for responders and requesters
| TAUBE_AMQP_ENABLED | undefined | If set Taube will use AMQP instead of cote (axion). Does not disable cote publishers sending data
| TAUBE_AMQP_COTE_DISABLED | undefined |  If set, taube will not create cote components for Publishers and Subscribers

### Requesters and Responders

In order to activate HTTP for all Taube Requesters in a service you need to provide `TAUBE_HTTP_ENABLED=true` (if you are using it in a service inside stack, then this is already turned on).

#### Additional Responder Options

| Property         | Default   | Required | Description
| ---------------- |:---------:|:--------:| ---
| coteEnabled | undefined | no | Can be used to overwrite the global TAUBE_COTE_DISABLED setting per Responder

#### Additional Requester Options

| Property         | Default   | Required | Description
| ---------------- |:---------:|:--------:| ---
| coteEnabled | undefined | no | Can be used to overwrite the global TAUBE_COTE_DISABLED setting per Requester

## Publisher/Subscriber

I order to use RabbitMQ based pub/sub, you need to explicitly activate it using and TAUBE_AMQP_ENABLED and connect taube to a AMQP enabled message broker (e.g. RabbitMQ) using `taube.init()`.
