/* eslint-disable no-underscore-dangle */
const express = require('express')
const http = require('http')
const {
  createMiddleware,
  getSummary,
  getContentType,
} = require('@promster/express')

const { errors } = require('celebrate')
const config = require('./config')

// Setup express
const app = express()
app.use(express.json({ limit: config.http.limit }))

// Add prometheus metrics only if enabled
if (config.http.exposePrometheusMetrics) {
  // this gathers the metrics
  app.use(createMiddleware({
    app,
    options: {
      /**
       * This disabled garbage collection metrics, as they
       * crash the process with an obscure error.
       * We also do not need these metrics.
       */
      disableGcMetrics: true,
      /**
       * Prefix all metrics, so they do not overlap with metrics of
       * other sources (e.g. k8s)
       */
      metricPrefix: 'taube_',
    },
  }))
  // This exposes the metrics
  app.use('/-/taube-metrics', async(req, res) => {
    req.statusCode = 200
    res.setHeader('Content-Type', getContentType())
    res.end(await getSummary())
  })
}

app.use(errors())
// Mark the celebrate error handler, so we can move it later
app._router.stack[app._router.stack.length - 1]._isCelebrateErrorHandler = true

const server = http.createServer(app)

function ensureErrorHandlingMiddlewareIsLast() {
  const index = app._router.stack.findIndex((router) => router._isCelebrateErrorHandler)
  app._router.stack.push(app._router.stack.splice(index, 1)[0])
}

let startingPromise

// eslint-disable-next-line require-await
async function init() {
  if (startingPromise) return startingPromise

  // Find an open port in testing
  // Ref: https://nodejs.org/docs/latest-v14.x/api/net.html#net_server_listen_port_host_backlog_callback
  const port = config.testing ? 0 : config.http.port

  // Wrapping this in a promise enables us to await init() in tests
  startingPromise = new Promise((resolve) => {
    server.listen(port, () => {
      const assignedPort = server.address().port
      console.log('Taube running on port', assignedPort)
      if (config.testing) {
        // make sure in testing that the Requesters
        // get the correct port from the shared config
        config.http.port = assignedPort
      }

      resolve()
      startingPromise = Promise.resolve()
    })
  })
  return startingPromise
}

function getPort() {
  if (!startingPromise) {
    // eslint-disable-next-line max-len
    throw new Error('You need to initialize Taube HTTP before using HTTP based services (Add `taube.http.init()`. See README.md.')
  }
  return server.address().port
}

module.exports = {
  server,
  getPort,
  init,
  app,
  ensureErrorHandlingMiddlewareIsLast,
}
