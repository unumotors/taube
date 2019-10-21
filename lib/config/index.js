module.exports = {
  debug: !!process.env.TAUBE_HTTP_DEBUG,
  http: {
    enabled: !!process.env.TAUBE_HTTP_ENABLED,
    port: process.env.TAUBE_HTTP_PORT || 4321
  }
}
