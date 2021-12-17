const path = require('path')

const { Pact, Matchers } = require('@pact-foundation/pact')
const test = require('ava')

const { eachLike, like } = Matchers
const taube = require('../../../lib')
// eslint-disable-next-line ava/no-import-test-files
const index = require('./index')

const mockScooterProvider = new Pact({
  consumer: 'ConsumerService',
  provider: 'ScooterService',
  log: path.resolve(process.cwd(), 'test/pact/logs', 'pact.log'),
  logLevel: 'info',
  dir: path.resolve(process.cwd(), 'test/pact/consumer'),
})

const mockFleetProvider = new Pact({
  consumer: 'ConsumerService',
  provider: 'FleetService',
  log: path.resolve(process.cwd(), 'test/pact/logs', 'pact.log'),
  logLevel: 'info',
  dir: path.resolve(process.cwd(), 'test/pact/consumer'),
})

test.before(async() => {
  await mockScooterProvider.setup()
  const mockScooterClient = new taube.MockClient(index.scooterClient)
  mockScooterClient.linkClientToPactProvider(index.scooterClient.uri, mockScooterProvider)

  await mockFleetProvider.setup()
  const mockFleetClient = new taube.MockClient(index.fleetClient)
  mockFleetClient.linkClientToPactProvider(index.fleetClient.uri, mockFleetProvider)
})

test.after(async() => {
  await mockScooterProvider.finalize()

  await mockFleetProvider.finalize()
})

test.afterEach(async() => {
  await mockScooterProvider.verify()
  await mockScooterProvider.removeInteractions()

  await mockFleetProvider.verify()
  await mockFleetProvider.removeInteractions()
})

test.serial('taube Client can be used with pact (scooters)', async(t) => {
  await mockScooterProvider.addInteraction({
    state: 'scooters exist',
    uponReceiving: 'get all scooters',
    withRequest: {
      method: 'GET',
      path: '/scooters',
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: eachLike({
        _id: 'id',
        vin: 'vin',
        mdbSn: 'mdb-sn',
        dbcSn: 'dnc-sn',
      }),
    },
  })

  const response = await index.getScooters()

  t.deepEqual(response, [{
    _id: 'id',
    vin: 'vin',
    mdbSn: 'mdb-sn',
    dbcSn: 'dnc-sn',
  }])
})

test.serial('taube Client can be used with pact (scooter)', async(t) => {
  await mockScooterProvider.addInteraction({
    state: 'scooters exist',
    uponReceiving: 'get one scooter',
    withRequest: {
      method: 'GET',
      path: '/scooters/id-321',
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: like({
        _id: 'id-321',
        vin: 'vin',
        mdbSn: 'mdb-sn',
        dbcSn: 'dnc-sn',
      }),
    },
  })

  const response = await index.getScooter('id-321')

  t.deepEqual(response, {
    _id: 'id-321',
    vin: 'vin',
    mdbSn: 'mdb-sn',
    dbcSn: 'dnc-sn',
  })
})

test.serial('taube Client can be used with pact (fleet)', async(t) => {
  await mockFleetProvider.addInteraction({
    state: 'fleet exist',
    uponReceiving: 'get one fleet',
    withRequest: {
      method: 'GET',
      path: '/fleets/id-123',
    },
    willRespondWith: {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: like({
        _id: 'id-123',
        key: 'key',
      }),
    },
  })

  const response = await index.getFleet('id-123')

  t.deepEqual(response, {
    _id: 'id-123',
    key: 'key',
  })
})
