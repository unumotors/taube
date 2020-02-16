module.exports = {
  debug: !!process.env.TAUBE_HTTP_DEBUG || !!process.env.TAUBE_DEBUG,
  http: {
    enabled: !!process.env.TAUBE_HTTP_ENABLED,
    port: process.env.TAUBE_HTTP_PORT || 4321
  },
  got: {
    retries: process.env.TAUBE_RETRIES != undefined ? Number(process.env.TAUBE_RETRIES) : 3
  },
  testing: !!process.env.TAUBE_UNIT_TESTS || process.env.NODE_ENV == 'test',
  coteEnabled: !(process.env.TAUBE_COTE_DISABLED != undefined),
  amqp: {
    enabled: !!process.env.TAUBE_AMQP_ENABLED,
    coteEnabled: !(process.env.TAUBE_AMQP_COTE_DISABLED != undefined),
    uri: process.env.TAUBE_AMQP_URI
  }
}
