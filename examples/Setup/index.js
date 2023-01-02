import observability from '@unu/observability'
import taube from '@unu/taube'

taube.http.init()

// Observe the http server for healthchecks
observability.monitoring.observeServer(taube.http.server, taube.http.app)
// Shutdown all taube connections when shutting down service
observability.monitoring.addOnSignalHook(async() => {
  await taube.shutdown()
})
