/* eslint-disable global-require */
/* eslint-disable no-underscore-dangle */
const cote = require('@cloud/cote')

const coteHttp = { ...cote }
coteHttp.Requester = require('./components/requester')
coteHttp.Responder = require('./components/responder')
coteHttp.app = require('./app')
coteHttp.monitoring = require('./helpers/monitoring')

module.exports = coteHttp
