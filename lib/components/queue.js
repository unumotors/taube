import debugFactory from 'debug'
import amqp from '../amqp.js'
import { escape } from '../helpers/converter.js'

const debug = debugFactory('taube-publisher')

class Queue {
  constructor(options) {
    if (!options || !options.key) throw new Error('Queue requires "options" property "key" to be set')
    if (!options.brokerUri) throw new Error('"options.brokerUri" needs to be set')

    this.options = options

    this.key = options.key
    this.keyEscaped = escape(this.key)
    this.deadLetterExchange = options.deadLetterExchange || 'DeadExchange'

    this.amqp = amqp // so tests can mock it
    amqp.connection(this.options.brokerUri)
  }

  async enqueue(data) {
    if (!this.channel) {
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

        // Create the regular queue
        // Upsert a persistent(durable) queue (will make sure RabbitMQ saves the messages)
        await channel.assertQueue(this.keyEscaped, {
          durable: true,
          deadLetterExchange: this.deadLetterExchange,
        })
      })
    }
    const dataBuffer = Buffer.from(JSON.stringify(data))
    debug(`enqueued to queue ${this.keyEscaped}`)
    // Publish the message to the exchange specifying the route (topic)
    const res = await this.channel.sendToQueue(
      this.keyEscaped,
      dataBuffer,
      // Tell rabbitmq to persist the queue definition, so messages survive
      // RabbitMQ restarts
      { persistent: true },
    )

    return res
  }
}

export default Queue
