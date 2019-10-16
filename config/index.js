module.exports = {
  debug: !!process.env.COTE_HTTP_DEBUG,
  http: {
    enabled: !!process.env.COTE_HTTP_ENABLED,
    port: process.env.COTE_HTTP_PORT || 4321
  }
}
