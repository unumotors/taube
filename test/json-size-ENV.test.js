/* eslint-disable require-await */
import test from 'ava'

import Joi from 'joi'
import { promises as fs } from 'fs'
import path from 'path'
import esmock from 'esmock'

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_UNIT_TESTS = true
process.env.TAUBE_JSON_SIZE_LIMIT = '900kb'

let port; let
  taube
test.before(async() => {
  // we need to use esmock to import here, otherwise ESM would use the already initialized
  // taube instance, which has been initiated without the above env variables
  taube = await esmock('../lib/index.js')
  await taube.http.init() // this makes unit test cover 100%
  port = taube.http.getPort()
})

test('Should be able to process larger payloads based on express json config', async(t) => {
  const file = await fs.readFile(path.resolve('./test/test-files/860kb.json'))
  const payload = JSON.parse(file)

  const server = new taube.Server({})
  server.post(
    '/test-file-upload-limit/upload',
    {
      body: Joi.object().keys({
        payload: Joi.array(),
      }),
    },
    async(req) => {
      t.deepEqual(req.body.payload[0], payload[0])
      return { success: true }
    },
  )
  const client = new taube.Client({ uri: 'http://localhost', port })
  const res = await client.post('/test-file-upload-limit/upload', { payload })

  t.deepEqual(res, { success: true })
})
