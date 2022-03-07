const test = require('ava')

const taube = require('../lib')

const MockClient = require('../lib/components/mocking')

test.before(async() => {
  await taube.http.init()
})

test.serial('MockClient initialization fails if client is not passed in', (t) => {
  t.throws(
    () => new MockClient(),
    {
      message: 'Missing required "client" parameter in ClientMock initialization',
    },
  )
})

test.serial('MockClient initializes correctly', (t) => {
  const client = {
    uri: 'mock-client-uri',
  }

  t.notThrows(() => new MockClient(client))
})

test.serial('Mock Client adds client correctly', (t) => {
  const client = {
    uri: 'mock-client-uri',
  }

  const mockClient = new MockClient(client)
  t.deepEqual(mockClient.clients, {
    'mock-client-uri': client,
  })
})

test.serial('Mock Client links client to provider correctly', (t) => {
  const client = {
    uri: 'mock-client-uri',
  }

  const port = taube.http.getPort()

  // https://github.com/pact-foundation/pact-js/blob/master/src/dsl/mockService.ts
  const provider = {
    mockService: {
      port,
    },
  }

  const mockClient = new MockClient(client)
  mockClient.linkClientToPactProvider(client.uri, provider)

  const expectedClients = {
    'mock-client-uri': {
      uri: 'http://localhost',
      port,
    },
  }

  t.deepEqual(mockClient.clients, expectedClients)
})

test.serial('linkClientToPactProvider() throws if client not found', (t) => {
  const client = {
    uri: 'mock-client-uri',
  }

  const mockClient = new MockClient(client)

  t.throws(
    () => mockClient.linkClientToPactProvider('any-uri', {}),
    {
      message: 'Client with URI "any-uri" not found',
    },
  )
})
