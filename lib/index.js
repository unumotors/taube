/* eslint-disable global-require */
/* eslint-disable no-underscore-dangle */
const taube = { }
taube.Requester = require('./components/requester')
taube.Responder = require('./components/responder')
taube.monitoring = require('./helpers/monitoring')
taube.Sockend = require('./components/sockend')
taube.Publisher = require('./components/publisher')
taube.Subscriber = require('./components/subscriber')
taube.Worker = require('./components/worker')
taube.Queue = require('./components/queue')
taube.Errors = require('./components/errors')
taube.Client = require('./components/client')
taube.Server = require('./components/server')

// Exposes express and http
taube.http = require('./http')
taube.amqp = require('./amqp')

taube.Joi = require('joi')

taube.init = async(options = {}) => {
  await taube.amqp.init(options.amqp)
}

/**
 * Gracefully shutdown taube
 */
taube.shutdown = async() => {
  await taube.amqp.shutdown()
}

module.exports = taube
