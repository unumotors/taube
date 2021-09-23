const amqp = require('../amqp')
const converter = require('../helpers/converter')
const debug = require('debug')('queue-v2')

class QueueWorkerExponentialRetries {
  constructor(queueName, options) {
    this.options = { worker: {}, ...options }
    if (!queueName) {
      throw new Error('"queueName" needs to be set')
    }

    this.name = converter.escape(queueName)
    // ref prefetch: http://www.squaremobius.net/amqp.node/channel_api.html#channel_prefetch
    this.options.worker.prefetch = this.options.worker.prefetch || 1
    this.options.primaryExchange = `exchange-${this.name}`
    this.options.retryExchange = `exchange-${this.name}.retry`
    this.options.errorHandler = this.options.errorHandler
    this.delays = this.options.delays ||
     [
       1, // 1 second
       10, // 10 seconds
       60, // 1 minute
       10 * 60, // 10 minutes
       30 * 60, // 30 minutes
       24 * 60 * 60 // 24 hours
     ]

    this.retryQueues = {}


    amqp.connection()
    this.amqp = amqp // so tests can mock it
  }

  async init() {
    if (this.initiationPromise) {
      debug(this.name, 'not initializing again, has connection')
      return this.initiationPromise
    }
    debug(this.name, 'initializing')

    this.initiationPromise = new Promise(async(resolve) => {
      this.channel = await this.amqp.channel()
      debug(this.name, 'connection established, starting creation of queues')

      await this.channel.addSetup(async(channel) => {
        await this.createPrimaryExchangeAndQueue(channel)
        await this.createRetryExchange(channel)
      })

      debug(this.name, 'queues created')
      resolve()
    })

    await this.initiationPromise
  }

  async handleMessage(channel, message, fn) {
    // Convert buffer to string
    const data = message.content.toString()
    const { headers } = message.properties
    const payload = JSON.parse(data)
    debug(this.name, ': Handling message -', data)
    try {
      await fn(payload, headers)
      await channel.ack(message)
    } catch (error) {
      try {
        await this.retryMessage({
          channel, message, error, payload
        })
      } catch (error) {
        await this.handleErrorMessage({
          channel, message, error, payload
        })
      }
    }
  }

  async retryMessage({
    channel, message, error, payload
  }) {
    const { headers } = message.properties
    const attemptNumber = this.deathCount(headers)

    // The routing key will have QUEUE_NAME.RETRY
    // e.g. some-queue-name.1000 or some-retry-name.5000 (the integer at the end is the duration of the retry)
    // This does remove the RETRY part
    let keyRoutingSegments = message.fields.routingKey.split('.')
    if (Number.isInteger(Number(keyRoutingSegments[keyRoutingSegments.length - 1]))) {
      keyRoutingSegments.pop()
    }

    if (attemptNumber < this.delays.length) {
      const delay = this.delays[attemptNumber]

      keyRoutingSegments.push(delay)
      const routingKey = keyRoutingSegments.join('.')

      const retryQueueName = await this.getRetryQueue(channel, delay)
      debug(this.name, 'binding', retryQueueName, 'to', routingKey)
      await channel.bindQueue(
        /* queue: */ retryQueueName,
        /* source: */ this.options.retryExchange,
        /* pattern: */ routingKey
      )
      // eslint-disable-next-line max-len
      debug(this.name, 'Retrying:', 'routingKey:', routingKey, 'attempt:', attemptNumber)
      await channel.publish(
        this.options.retryExchange,
        routingKey,
        message.content,
        { headers: message.properties.headers }
      )
      await channel.ack(message)
    } else {
      // There are no retries left for this, lets put it on the error queue
      debug(this.name, 'Not retrying')
      await this.handleErrorMessage({
        channel, message, error, payload
      })
    }
  }

  async handleErrorMessage({
    channel,
    message, // raw message
    payload, // decrypted payload
    error // thrown error
  }) {
    try {
      await channel.nack(
        /* message: */ message,
        /* allUpTo: */ false,
        /* requeue: */ false
      )
    } catch (nackError) {
      console.error(nackError)
      console.error(nackError.stack)
      console.error(nackError.stackAtStateChange)
      throw nackError
    }
    this.options.errorHandler && this.options.errorHandler({
      error, message, payload, instance: this
    })
  }

  async getRetryQueue(channel, delaySeconds) {
    const queueName = `${this.name}.retry.${delaySeconds}`
    if (this.retryQueues[queueName]) return this.retryQueues[queueName]

    const messageTtl = delaySeconds * 1000
    await channel.assertQueue(queueName, {
      durable: true,
      deadLetterExchange: this.options.primaryExchange,
      expires: messageTtl * 2, // this queue auto deletes itself if not used
      messageTtl
    })
    this.retryQueues[queueName] = queueName
    return queueName
  }

  deathCount(headers) {
    if (!headers || !headers['x-death']) return 0
    return headers['x-death'].reduce((accumulator, xDeath) => {
      if (xDeath.queue.includes(this.name)) {
        return accumulator += xDeath.count
      }
      return accumulator
    }, 0)
  }

  async handleChannelCancelled(channel, fn) {
    debug(this.name, 'channel was canceled, handling')
    // In case consumer has been cancelled
    // try to re-setup everything
    await amqp.shutdownChannel(channel)
    debug(this.name, 'channel closed')
    this.channel = null
    this.initiationPromise = null
    await this.consume(fn)
    debug(this.name, 'finished re-initialization')
  }

  async createRetryExchange(channel) {
    await this.createExchange(channel, this.options.retryExchange, 'topic')
  }

  async createPrimaryExchangeAndQueue(channel) {
    await this.createExchange(channel, this.options.primaryExchange, 'topic')
    await channel.assertQueue(this.name, {
      durable: true
    })
    await channel.bindQueue(
      /* queue: */ this.name,
      /* source: */ this.options.primaryExchange,
      /* pattern: */ `${this.name}.*`
    )
    debug(this.name, 'created primary exchange and channel')
  }

  async createExchange(channel, name, type) {
    await channel.assertExchange(name, type, {
      durable: true
    })
  }
}

class Queue extends QueueWorkerExponentialRetries {
  async enqueue(data, headers = {}) {
    await this.init()
    const dataBuffer = Buffer.from(JSON.stringify(data))
    return await this.channel.sendToQueue(this.name, dataBuffer, { persistent: true, headers })
  }
}

class Worker extends QueueWorkerExponentialRetries {
  async consume(fn) {
    debug(this.name, 'consume()', fn && fn.toString())
    if (typeof fn != 'function') throw new Error('First argument to "consume" must be a function')

    debug(this.name, 'checking initiation')
    await this.init()

    await this.channel.addSetup(async(channel) => {
      await channel.prefetch(this.options.worker.prefetch)
      await channel.consume(this.name, async(message) => {
        if (message == null) {
          // If the consumer is cancelled by RabbitMQ, the message callback will be invoked with null.
          // For more information: https://www.squaremobius.net/amqp.node/channel_api.html#channel_consume
          return await this.handleChannelCancelled(channel, fn)
        }
        await this.handleMessage(channel, message, fn)
      })
    })
  }
}


module.exports = {
  Queue,
  Worker
}
