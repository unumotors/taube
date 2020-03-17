const amqp = require('../amqp')
const converter = require('../helpers/converter')
const debug = require('debug')('taube-publisher')
const config = require('../config')
const upstreamCote = require('@cloud/cote')

class Publisher {
  constructor(options, discoveryOptions) {
    if (!options || !options.key) throw new Error('Publisher requires "options" property "key" to be set')

    this.key = options.key
    this.keyEscaped = converter.escape(this.key)

    this.coteEnabled = options.coteEnabled != undefined ? options.coteEnabled : config.amqp.coteEnabled

    if (this.coteEnabled) {
      this.cote = new upstreamCote.Publisher(options, { log: false, ...discoveryOptions })
    }

    if (config.amqp.enabled) {
      amqp.connection()
      this.amqp = amqp // so tests can mock it
    }
  }

  async publish(topic, data) {
    if (typeof topic != 'string') throw new Error('First argument to publish must be the topic (a string)')
    // use cote?
    let usedCote = false
    let usedAmqp = false
    if (this.coteEnabled) {
      usedCote = true
      await this.cote.publish(topic, data)
    }
    // Should also use amqp?
    if (!config.amqp.enabled) return { usedCote, usedAmqp }
    // AMQP is enabled
    usedAmqp = true
    debug('using amqp')
    // We need only one channel to the exchange for this publisher
    // as it can be reused
    if (!this.channel) {
      this.channel = await this.amqp.channel()
      await this.channel.addSetup(async(channel) => {
        // Make sure exchange exists
        await channel.assertExchange(this.keyEscaped, 'direct', { durable: false })
      })
    }
    const topicEscaped = converter.escape(topic)
    const dataBuffer = Buffer.from(JSON.stringify(data))
    debug(`publishing to exchange ${this.keyEscaped} on topic ${topicEscaped}`)
    // Publish the message to the exchange specifying the route (topic)
    let res = await this.channel.publish(this.keyEscaped, topicEscaped, dataBuffer)

    if (config.debug) {
      res = {
        ...res,
        topicEscaped,
        dataBuffer,
        amqp: { options: this.amqpOptions },
        usedCote,
        usedAmqp
      }
    }

    return res
  }
}

module.exports = Publisher
