/* eslint-disable no-bitwise */
/* eslint-disable require-await */
/* eslint-disable global-require */
const test = require('ava')
const got = require('got')

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
delete process.env.TAUBE_UNIT_TESTS
process.env.TAUBE_EXPOSE_PROMETHEUS_METRICS = 'true'

test.serial('taube exposes express metrics', async(t) => {
  const taube = require('../lib')
  await taube.http.init()
  const { Joi } = taube
  const server = new taube.Server()
  server.get('/metrics-test/:vin', {
    params: Joi.object().keys({
      vin: Joi.string(),
    }),
  }, async() => {})

  const client = new taube.Client({ uri: 'http://localhost' })
  await client.get('/metrics-test/1234')

  const response = await got.get('http://localhost:4321/-/taube-metrics')
  t.regex(
    response.body,
    // eslint-disable-next-line prefer-regex-literals
    new RegExp('http_requests_total{method="get",path="/metrics-test/#val",status_code="200"} 1', 'g'),
    'should have exactly 1 request ',
  )
})
