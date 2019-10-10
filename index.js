/* eslint-disable global-require */
/* eslint-disable no-underscore-dangle */
const cote = require('@cloud/cote')

const coteHttp = { ...cote }
coteHttp.Requester = require('./components/requester')
coteHttp.Responder = require('./components/responder')

module.exports = coteHttp
