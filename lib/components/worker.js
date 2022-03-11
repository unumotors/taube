const debug = require('debug')('taube-subscriber')

const amqp = require('../amqp')
const converter = require('../helpers/converter')

class Worker {
  constructor(options) {
    if (!options || !options.key) throw new Error('Worker requires "options" property "key" to be set')
    if (!options.brokerUri) throw new Error('"options.brokerUri" needs to be set')

    this.options = options

    this.key = options.key
    this.keyEscaped = converter.escape(this.key)

    // Taube.worker's setup of `x-dead-letter-exchange` needs to match the Taube.queue's setup,
    // otherwise an error would be thrown during queue decleration.
    this.deadLetterExchange = options.deadLetterExchange || 'DeadExchange'

    // Number of messages this Worker can deal with at once
    this.prefetch = options.prefetch != undefined ? options.prefetch : 1

    this.amqp = amqp // so tests can mock it
    amqp.connection(this.options.brokerUri)
  }

  async consume(fn) {
    if (typeof fn != 'function') throw new Error('First argument to "consume" must be a function')
    if (this.channel) {
      throw new Error('There can only be one "consume"er per Worker')
    }

    this.channel = await this.amqp.channel(this.options)
    await this.channel.addSetup(async(channel) => {
      // Create the dead letter exchange
      const errorQueue = `error-${this.keyEscaped}`
      await this.channel.assertExchange(this.deadLetterExchange, 'direct')

      // Create the error queue
      await this.channel.assertQueue(errorQueue, {
        durable: true,
        deadLetterExchange: this.deadLetterExchange,
      })

      // Assert a routing path from an exchange to a queue:
      // the exchange named by `source` will relay messages to the `queue` named,
      // according to the type of the exchange and the `pattern` given.
      // https://www.squaremobius.net/amqp.node/channel_api.html#channel_bindQueue
      await this.channel.bindQueue(
        /* queue: */ errorQueue,
        /* source: */ this.deadLetterExchange,
        /* pattern: */ this.keyEscaped,
      )

      // Upsert a persistent(durable) queue (will make sure RabbitMQ saves the messages)
      await channel.assertQueue(this.keyEscaped, {
        durable: true,
        deadLetterExchange: this.deadLetterExchange,
      })
      await channel.prefetch(this.prefetch)
      debug(`adding consumer to queue ${this.keyEscaped}`)
      this.consumer = await channel.consume(this.keyEscaped, async(msg) => {
        // If the consumer is cancelled by RabbitMQ, the message callback will be invoked with null.
        // For more information: https://www.squaremobius.net/amqp.node/channel_api.html#channel_consume
        if (msg == null) {
          // In case consumer has been cancelled
          // try to re-setup everything
          await amqp.shutdownChannel(this.channel)
          this.channel = null
          this.consumer = null
          return this.consume(fn).then().catch(amqp.getErrorHandler())
        }
        // Convert buffer to string
        const data = msg.content.toString()
        const { headers } = msg.properties
        const payload = JSON.parse(data)
        try {
          await fn(payload, headers)
          await this.channel.ack(msg)
        } catch (error) {
          // If `allUpTo` is truthy, all outstanding messages prior to and including the given message are rejected.
          // As with #ack, it’s a channel-ganking error to use a message that is not outstanding. Defaults to false.

          // If `requeue` is truthy, the server will try to put the message or messages back on the queue
          // or queues from which they came. Defaults to true if not given,
          // so if you want to make sure messages are dead-lettered or discarded, supply false here.
          // https://www.rabbitmq.com/confirms.html#consumer-nacks-requeue
          // https://www.squaremobius.net/amqp.node/channel_api.html#channel_nack
          this.channel.nack(
            /* message: */ msg,
            /* allUpTo: */ false,
            /* requeue: */ false,
          )
        }
      }, {
        // manual acknowledgment mode (default)
        // see https://www.rabbitmq.com/confirms.html for details
        noAck: false,
      })
    })
    return this.consumer
  }
}

module.exports = Worker
