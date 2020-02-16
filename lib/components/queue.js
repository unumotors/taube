const amqp = require('../amqp')
const converter = require('../helpers/converter')
const debug = require('debug')('taube-publisher')
const config = require('../config')

class Queue {
  constructor(options) {
    if (!options || !options.key) throw new Error('Queue requires "options" property "key" to be set')

    this.key = options.key
    this.keyEscaped = converter.escape(this.key)

    if (!config.amqp.enabled) {
      throw new Error('Queue requires AMPQ to be enabled and initialized')
    }
    amqp.connection()
    this.amqp = amqp // so tests can mock it
  }

  async enqueue(data) {
    if (!this.channel) {
      this.channel = await this.amqp.channel()
      // Upsert a persistent(durable) queue (will make sure RabbitMQ saves the messages)
      await this.channel.addSetup(async(channel) => {
        await channel.assertQueue(this.keyEscaped, {
          durable: true
        })
      })
    }
    const dataBuffer = Buffer.from(JSON.stringify(data))
    debug(`enqueued to queue ${this.keyEscaped}`)
    // Publish the message to the exchange specifying the route (topic)
    let res = await this.channel.sendToQueue(
      this.keyEscaped, dataBuffer,
      // Tell rabbitmq to persist the queue definition, so messages survive
      // RabbitMQ restarts
      { persistent: true }
    )

    return res
  }
}

module.exports = Queue
