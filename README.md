# 🕊 Taube

Taube is a microservice communication framework that enforces compatibility between Clients and Servers.

It is designed to enforce RESTful API design and provide easy Queueing without complex setup. It also provides standardized Errors.

It aims to leverage existing tooling as much as possible such as DNS and service discovery from an external provider as well as existing transfer protocols that are well supported and maintained:

- HTTP (express)
- RESTful
- AMQP (RabbitMQ)

This repository does not publish npm packages **yet**.

## Table of Contents

1. [Quick start guide](##Quick-start-guide)
1. [Environment variables](#Environment-variables)
1. [Monitoring and Signal Handling](#Monitoring-and-Signal-Handling)
1. [Publisher/Subscriber](#Publisher/Subscriber)
1. [Queue/Worker](#Queue/Worker)
1. [Errors](#Errors)
1. [Writing unit tests](#Writing-unit-tests)
1. [Migrate from cote](#Migrate-from-cote)


## Quick start guide

One service acts as a `Server` providing data and another as a `Client` requesting data.

```javascript
const taube = require('@cloud/taube')

const server = new taube.Server({})
server.get(
  `/scooters/:id`,
  {
    params: Joi.object().keys({
      id: Joi.string().required()
    })
  },
  async(req) => {
    return `Data for ${req.params.id}`
  }
)
```

Any Client can now request data:

```javascript
const taube = require('@cloud/taube')

const client = new taube.Client({
  uri: 'http://scooter'
})

async function run() {
  await client.get('/scooters/123')
}
```

## Client/Server
The `Client` and `Server` components mimic the standard way of sending and routing http request, using the correct RESTful verbs.
### Client
`Client` component is a wrapper around [got](https://github.com/sindresorhus/got) that exposes different http methods to send a request.

```javascript
const taube = require('@cloud/taube')

const client = new taube.Client({
  uri: 'http://scooter'
})
```
the `Client` supports 4 http methods:
#### GET
```javascript
const response = await client.get('/scooters',
                                { query: { type: 'UNU2' } }) // Query
```

#### POST
```javascript
const response = await client.post('/scooters',
                                { vin: '123' }, // Body
                                { query: { type: 'UNU2' } }) // Query
```

#### PUT
```javascript
const response = await client.put('/scooters/123',
                                 { online: true }, // body
                                 { query: { type: 'UNU2' } }) // Query
```

#### DELETE
```javascript
const response = await client.delete('/scooters/123', { type: 'UNU2' })
```

NOTE: Passing in `options` with a `query` option does overwrite any passed url query arguments:
```
// This will NOT pass `page`
client.get(`/?page=2`, { query: { type: 'UNU2' }})
```

#### Client Options

| Property         | Default   | Required | Description
| ---------------- |:---------:|:--------:| ---
| uri              | - | yes       | the protocol plus the hostname to where the http request will be made
| port             | 4321      | no       | Port of Client in case of non default port


### Server
`Server` is a wrapper around the express `Router` that can register routes. it also enforces validation for all routes.

```javascript
const taube = require('@cloud/taube')

const server = new taube.Server({})
```

The `Server` component support 4 methods, each method expects 3 **required** arguments passed in to it:
- path: the route (express style)
- validation: a [Joi](https://github.com/sideway/joi) object describing how the `body` and/or `params` of the request must look like
- handler function

#### GET
```javascript
  server.get(
    `/scooters/:id`,
    {
      params: Joi.object().keys({
        id: Joi.string().required()
      }),
      query: Joi.object().keys({
        type: Joi.string().required()
      })
    },
    async(req) => {
      // do something
    }
  )
```
#### POST
```javascript
  server.post(
    `/scooters`,
    {
      body: Joi.object().keys({
        vin: Joi.string().required()
      })
    },
    async(req) => {
      // do something
    }
  )
```
#### PUT
```javascript
  server.put(
    '/scooters/:id',
    {
      body: Joi.object().keys({
        online: Joi.boolean()
      }),
      params: Joi.object().keys({
        id: Joi.string().required()
      })
    },
    async(req) => {
      // do something
    }
  )
```
#### DELETE
```javascript
  server.delete(
    `/scooters/:id`,
    {
      params: Joi.object().keys({
        id: Joi.string().required()
      })
    },
    async(req) => {
      // do something
    }
  )
```

### Pagination
Taube supports pase-based pagination. A paginated route can be registered on the `Server` like this:
```javascript
server.paginate(
  '/scooters',
  {},
  async(req) => {
    // req.query.page
    // req.query.limit
  }
)
```
This route also accepts Joi validation parameters. Validating the `page` and `limit` happens automatically and you don't need to manually validate those on the `req.query` object.
`Server` expects the response returned from a paginated handler to be in this specific format. **If you don't return it, a run-time error will be thrown.**
```javascript
{
  data: [] // array of the results,
  pagination: { // metadata about the pagination
    page: Number,
    limit: Number,
    totalDocs: Number,
    totalPages: Number,
    hasNextPage: Boolean,
    nextPage: Number,
    hasPrevPage: Boolean,
    prevPage: Number,
    pagingCounter: Number
  }
}
```

To make a request to a paginated route, you can use the `Client` in this way:
```javascript
const response = await client.paginate('/scooters')
```
The `client.paginate` function accepts a second `options` object that describes the `page` and `limit`.
By default Taube uses the values `{ page: 1, limit: 20 }` if no `options` is passed in, otherwise uses the passed in values.
```javascript
const response = await client.paginate('/scooters', { page: 3, limit: 10 })
// response.data
// response.pagination
```

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
| TAUBE_JSON_SIZE_LIMIT |500kb | Size limit for JSON file

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
## Publisher/Subscriber

The Publisher/Subscriber components can be used to connect to a AMQP enabled message broker. They provide the Publisher/Subscriber pattern to taube users.

To use these features you need to explicitly connect taube to a AMQP enabled message broker (e.g. RabbitMQ) using `taube.amqp.init()`. `taube.amqp.init()` can be called multiple times. It only has an effect once.

Taube does handle reconnecting to RabbitMQ through a library. All requests during a connection outage are saved in memory and will be flushed after reconnecting. There is no timeout for this, it will save messages indefinitely.

```
// Set TAUBE_AMQP_URI environment variable through your orchestration
taube.amqp.init()
// or pass directly
taube.amqp.init({ uri: process.env.TAUBE_AMQP_URI })
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

## Queue/Worker

Taube supports RabbitMQ queue workers with exponential retries.

Every message will be retried multiple times and discarded if the last retry fails.

**Every message will be retried after 1, 10, 60 seconds, 10 minutes and 24 hours.** After that they are considered failed. An error handler can be passed for failed messages. If no error handler is passed, they are discarded.

The Queue/Worker is made up of two parts:
- The `Queue` component sends messages to the queue to be consumed
- The `Worker` component handles messages coming in the queue and consumes them

In order for the Queue/Worker component to be available, you need to initialize `amqp`.

```js
// Set TAUBE_AMQP_URI environment variable through your orchestration
taube.amqp.init()
// or pass directly
taube.amqp.init({ uri: process.env.TAUBE_AMQP_URI })
```

The `Queue` component can be used to `enqueue` any data that can be used with `JSON.stringify`:

```js
const { Queue } = taube.QueueWorkerExponentialRetries

const queue = new taube.Queue('example-queue-1')
await queue.enqueue({ some: 'data' })
```

The `Worker` component will consume these messages:

```js
const { Worker } = taube.QueueWorkerExponentialRetries

const worker = new Worker('example-queue-1', {
  worker: {
    prefetch: 2 // change worker prefetch value
  }
  errorHandler: ({
    error, message, payload, instance
  }) =>
    // e.g. send to Sentry
    console.error(
      error, // the thrown error
      message, // the original RabbitMQ message
      payload, // the containing payload
      instance // the Worker instance, can be used to get the name: instance.name
    )
})
await worker.consume((data) => {
  console.log(data)
})
```

The optional `errorHandler` will be called if all retries failed.

### Technical Details

This setup is based upon https://www.brianstorti.com/rabbitmq-exponential-backoff/

In summary, failed messages are put on retry queues with a specific TTL (e.g. queue-1.1000 for 1 second). Those retry queues do not have a consumer and messages on it will always end up on the dead letter exchange. In our case, that exchange is the primary exchange again.

This way we make sure that messages are re-processed.

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

Currently does not support Publisher/Subscriber unit testing. Those unit tests will require a usable AMQP message broker connection initialized using `taube.amqp.init()`. You will need to call `taube.shutdown()` in

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

In order to use RabbitMQ based pub/sub, you need to explicitly activate it using and TAUBE_AMQP_ENABLED and connect taube to a AMQP enabled message broker (e.g. RabbitMQ) using `taube.amqp.init()`.
