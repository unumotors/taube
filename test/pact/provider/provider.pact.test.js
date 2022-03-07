const path = require('path')
const Joi = require('joi')

// Overwrite cloud group setting or this test will automatically connect to the pact broker
delete process.env.PACT_BROKER_BASE_URL
delete process.env.PACT_BROKER_BASIC_AUTH_PASSWORD
delete process.env.PACT_BROKER_BASIC_AUTH_USERNAME

const { Verifier } = require('@pact-foundation/pact')
const test = require('ava')

const taube = require('../../../lib')

test.before(async() => {
  await taube.http.init()
})

test.before((t) => {
  const server = new taube.Server()

  server.get('/scooters', {
    body: Joi.object().keys({
      _id: Joi.string(),
      vin: Joi.string(),
      mdbSn: Joi.string(),
      dbcSn: Joi.boolean(),
    }),
  }, () => [{
    _id: 'id',
    vin: 'vin',
    mdbSn: 'mdb-sn',
    dbcSn: 'dnc-sn',
  }])

  server.get('/scooters/:id', {
    params: Joi.object().keys({
      id: Joi.string(),
    }),
  }, (req) => ({
    _id: req.params.id,
    vin: 'vin',
    mdbSn: 'mdb-sn',
    dbcSn: 'dnc-sn',
  }))
  t.context = { server }
})

test.serial('taube Server can be used to verify a pact', async(t) => {
  const opts = {
    logLevel: 'warn',
    providerBaseUrl: `http://localhost:${taube.http.getPort()}`,
    provider: 'ScooterService',
    providerVersion: '1.0.0',
    pactUrls: [
      path.resolve(__dirname, './consumerservice-scooterservice.json'),
    ],
  }

  await t.notThrowsAsync(async() => {
    const output = await new Verifier(opts).verifyProvider()
    console.log(output)
  })
})
