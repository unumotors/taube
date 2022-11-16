import debugFactory from 'debug'
import amqp from '../amqp.js'
import { escape } from '../helpers/converter.js'

const debug = debugFactory('taube-publisher')

/**
 * @deprecated
 */
class Publisher {
  constructor(options) {
    if (!options || !options.key) throw new Error('Publisher requires "options" property "key" to be set')
    if (!options.brokerUri) throw new Error('"options.brokerUri" needs to be set')
    this.options = options

    this.key = options.key
    this.keyEscaped = escape(this.key)

    amqp.connection(this.options.brokerUri)
    this.amqp = amqp // so tests can mock it
  }

  async publish(topic, data) {
    if (typeof topic != 'string') throw new Error('First argument to publish must be the topic (a string)')
    // We need only one channel to the exchange for this publisher
    // as it can be reused
    if (!this.channel) {
      this.channel = await this.amqp.channel(this.options)
      await this.channel.addSetup(async(channel) => {
        // Make sure exchange exists
        await channel.assertExchange(this.keyEscaped, 'direct', { durable: false })
      })
    }
    const topicEscaped = escape(topic)
    const dataBuffer = Buffer.from(JSON.stringify(data))
    debug(`publishing to exchange ${this.keyEscaped} on topic ${topicEscaped}`)
    // Publish the message to the exchange specifying the route (topic)
    const res = await this.channel.publish(this.keyEscaped, topicEscaped, dataBuffer)

    return res
  }
}

export default Publisher
