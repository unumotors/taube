/* eslint-disable require-await */
const test = require('ava')
const Joi = require('joi')
const fs = require('fs').promises
const path = require('path')

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_UNIT_TESTS = true

const taube = require('../lib')

let port
test.before(async() => {
  await taube.http.listen() // this makes unit test cover 100%
  port = taube.http.getPort()
})

test('Should throw error when processing payloads larger than default threshold', async(t) => {
  const file = await fs.readFile(path.resolve('./test/test-files/200kb.json'))
  const payload = JSON.parse(file)

  const server = new taube.Server({})
  server.post(
    `/test-file-upload-limit/upload`,
    {
      body: Joi.object().keys({
        payload: Joi.array()
      })
    },
    async(req) => {
      t.deepEqual(req.body.payload[0], payload[0])
      return { success: true }
    }
  )
  const client = new taube.Client({ uri: 'http://localhost', port })
  const res = await t.throwsAsync(client.post(`/test-file-upload-limit/upload`, { payload }))

  t.deepEqual(res.statusCode, 413)
  t.deepEqual(res.message, 'Response code 413 (Payload Too Large)')
})
