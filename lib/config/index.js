module.exports = {
  debug: !!process.env.TAUBE_HTTP_DEBUG || !!process.env.TAUBE_DEBUG,
  http: {
    port: process.env.TAUBE_HTTP_PORT || 4321,
    limit: process.env.TAUBE_JSON_SIZE_LIMIT || '500kb',
  },
  got: {
    retries: process.env.TAUBE_RETRIES != undefined ? Number(process.env.TAUBE_RETRIES) : 3,
  },
  testing: !!process.env.TAUBE_UNIT_TESTS || process.env.NODE_ENV == 'test',
  amqp: {
    initialConnectionTimeout:
      process.env.TAUBE_AMQP_INITIAL_CONNECTION_TIMEOUT != undefined
        ? Number(process.env.TAUBE_AMQP_INITIAL_CONNECTION_TIMEOUT) : 30000, // 30 seconds
  },
}
