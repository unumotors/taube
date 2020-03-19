const amqp = require('../amqp')
const converter = require('../helpers/converter')
const debug = require('debug')('taube-subscriber')

class Worker {
  constructor(options) {
    if (!options || !options.key) throw new Error('Worker requires "options" property "key" to be set')

    this.key = options.key
    this.keyEscaped = converter.escape(this.key)

    // Number of messages this Worker can deal with at once
    this.prefetch = options.prefetch != undefined ? options.prefetch : 1

    amqp.connection()
    this.amqp = amqp // so tests can mock it
  }

  async consume(fn) {
    if (typeof fn != 'function') throw new Error('First argument to "consume" must be a function')
    if (this.channel) {
      throw new Error('There can only be one "consume"er per Worker')
    }

    this.channel = await this.amqp.channel()
    await this.channel.addSetup(async(channel) => {
      // Upsert a persistent(durable) queue (will make sure RabbitMQ saves the messages)
      await channel.assertQueue(this.keyEscaped, {
        durable: true
      })
      await channel.prefetch(this.prefetch)
      debug(`adding consumer to queue ${this.keyEscaped}`)
      await channel.consume(this.keyEscaped, async(msg) => {
        // Convert buffer to string
        const data = msg.content.toString()
        const obj = JSON.parse(data)
        await fn(obj)
        this.channel.ack(msg)
      }, {
        // manual acknowledgment mode (default)
        // see https://www.rabbitmq.com/confirms.html for details
        noAck: false
      })
    })
  }
}

module.exports = Worker
