const uriHelper = require('../helpers/uri')

class ClientMock {
  constructor(client) {
    if (!client) throw new Error('Missing required "client" parameter in ClientMock initialization')

    this.clients = {}
    this.addClient(client)
  }

  addClient(client) {
    this.clients[client.uri] = client
  }

  linkClientToPactProvider(clientUri, provider) {
    const client = this.clients[uriHelper.fixClientURI(clientUri)]
    if (!client) throw new Error(`Client with URI "${clientUri}" not found`)
    client.uri = uriHelper.fixClientURI('http://localhost')
    client.port = provider.mockService.port
  }
}

module.exports = ClientMock
