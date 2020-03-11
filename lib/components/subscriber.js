const amqp = require('../amqp')
const converter = require('../helpers/converter')
const debug = require('debug')('taube-subscriber')
const config = require('../config')
const upstreamCote = require('@cloud/cote')

class Subscriber {
  constructor(options, discoveryOptions) {
    if (!options || !options.key) throw new Error('Subscriber requires "options" property "key" to be set')

    this.key = options.key
    this.keyEscaped = converter.escape(this.key)

    this.fns = {}

    this.coteEnabled = options.coteEnabled != undefined ? options.coteEnabled : false

    if (this.coteEnabled || !config.amqp.enabled) {
      this.cote = new upstreamCote.Subscriber(options, { log: false, ...discoveryOptions })
    }

    if (config.amqp.enabled) {
      amqp.connection()
      this.fns = {}
      this.topics = []
    }
  }

  async setupChannel() {
    // Have a promise, so multiple callers do not all setup a new channel/q,
    // but share a global one. When then promise is resolved, all
    // queues can be bound
    if (this.initializingPromise) return this.initializingPromise
    let resolve
    this.initializingPromise = new Promise(res => {
      resolve = res
    })

    // Get a channel and an exchange to communicate to rabbitmq
    if (!this.channel) {
      this.channel = await amqp.channel()
      await this.channel.assertExchange(this.keyEscaped, 'direct', { durable: false })
    }
    // Create a queue for this subscriber
    // For more information: Create a "Temporary queue" that is non-durable queue with a generated name
    // https://www.rabbitmq.com/tutorials/tutorial-three-javascript.html
    if (!this.q) {
      this.q = await this.channel.assertQueue('', { exclusive: true })
    }

    // Add a consumer function that is called whenever the above queue recieves a message
    // (includes all message types)
    // API: http://www.squaremobius.net/amqp.node/channel_api.html#channel_consume
    if (!this.consumer) {
      this.consumer = await this.channel.consume(this.q.queue, (msg) => {
        if (msg == null) {
          // In case consumer has been cancelled
          // try to re-setup everything (basically a reconnect)
          // For more information: https://www.rabbitmq.com/consumer-cancel.html
          this.q = null
          this.consumer = null
          return Object.keys(this.fns).forEach(topic =>
            this.fns[topic].forEach(fn =>
              this.on(topic, fn).then().catch(amqp.getErrorHandler())))
        }
        const topic = msg.fields.routingKey
        // Convert buffer to string
        const data = msg.content.toString()
        const obj = JSON.parse(data)
        this.fns[topic].forEach(fn => fn(obj))
      }, {
        // Automatic acknowlegement mode
        // - No acknowledgement will be necessary
        // see https://www.rabbitmq.com/confirms.html for details
        noAck: true
      })
    }
    // Resolve promises waiting for initialization
    resolve()
    this.initializingPromise = null
    return this.consumer
  }

  async on(topic, fn) {
    if (typeof topic != 'string') throw new Error('First argument to "on" must be the topic (a string)')
    if (typeof fn != 'function') throw new Error('Second argument to "on" must be a function')

    // Use cote?
    if (!config.amqp.enabled || this.coteEnabled) {
      return this.cote.on(topic, fn)
    }

    // If AMQP is enabled, use that
    const topicEscaped = converter.escape(topic)
    debug(`subscribing to queue ${this.keyEscaped} on topic ${topicEscaped}`)

    await this.setupChannel()
    this.channel.bindQueue(this.q.queue, this.keyEscaped, topicEscaped)

    if (!this.fns[topicEscaped]) this.fns[topicEscaped] = []
    this.fns[topicEscaped].push(fn)

    let res = {}

    if (config.debug) {
      res = {
        topicEscaped
      }
    }
    return res
  }
}

module.exports = Subscriber
