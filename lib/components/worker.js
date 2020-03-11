const amqp = require('../amqp')
const converter = require('../helpers/converter')
const debug = require('debug')('taube-subscriber')
const config = require('../config')

class Worker {
  constructor(options) {
    if (!options || !options.key) throw new Error('Worker requires "options" property "key" to be set')

    this.key = options.key
    this.keyEscaped = converter.escape(this.key)

    // Number of messages this Worker can deal with at once
    this.prefetch = options.prefetch != undefined ? options.prefetch : 1

    if (!config.amqp.enabled) {
      throw new Error('Worker requires AMPQ to be enabled and initialized')
    }
    amqp.connection()
    this.amqp = amqp // so tests can mock it
  }

  async consume(fn) {
    if (typeof fn != 'function') throw new Error('First argument to "consume" must be a function')
    if (this.channel) {
      throw new Error('There can only be one "consume"er per Worker')
    }

    this.channel = await this.amqp.channel()
    // Upsert a persistent(durable) queue (will make sure RabbitMQ saves the messages)
    await this.channel.assertQueue(this.keyEscaped, {
      durable: true
    })
    this.channel.prefetch(this.prefetch)
    // If AMQP is enabled, use that
    debug(`adding consumer to queue ${this.keyEscaped}`)
    let res = await this.channel.consume(this.keyEscaped, async(msg) => {
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

    return res
  }
}

module.exports = Worker
