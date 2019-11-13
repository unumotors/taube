/* eslint-disable global-require */
/* eslint-disable no-underscore-dangle */
const cote = require('@cloud/cote')

const taube = { ...cote }
taube.Requester = require('./components/requester')
taube.Responder = require('./components/responder')
taube.monitoring = require('./helpers/monitoring')

// Exposes express and http
taube.http = require('./http')

module.exports = taube
