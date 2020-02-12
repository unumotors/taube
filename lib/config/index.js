module.exports = {
  debug: !!process.env.TAUBE_HTTP_DEBUG,
  http: {
    enabled: !!process.env.TAUBE_HTTP_ENABLED,
    port: process.env.TAUBE_HTTP_PORT || 4321
  },
  got: {
    retries: process.env.TAUBE_RETRIES != undefined ? Number(process.env.TAUBE_RETRIES) : 3
  },
  testing: !!process.env.TAUBE_UNIT_TESTS || process.env.NODE_ENV == 'test'
}
