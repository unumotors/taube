/* eslint-disable no-underscore-dangle */
const upstreamCote = require('@cloud/cote')
const optionsBuilder = require('./options-builder')

const ResponderHttp = require('./components/responder')
const RequesterHttp = require('./components/requester')

// Get upstream components
const {
  Responder,
  Requester,
  Publisher,
  Subscriber,
  Sockend,
  Monitor,
  MonitoringTool
} = upstreamCote
const Discovery = require('@cloud/cote/dist/components/discovery')

const cote = (options = {}) => {
  options = optionsBuilder(options)

  Discovery.setDefaults(options)

  const components = [
    ResponderHttp,
    RequesterHttp,
    Requester,
    Responder,
    Publisher,
    Subscriber,
    Sockend
  ]

  components.forEach(function(component) {
    component.setEnvironment(options.environment)
  })

  return cote
}

cote.Requester = RequesterHttp
cote.Responder = ResponderHttp
cote.Publisher = Publisher
cote.Subscriber = Subscriber
cote.Sockend = Sockend
cote.Monitor = Monitor
cote.MonitoringTool = MonitoringTool

module.exports = cote()
