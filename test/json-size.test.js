/* eslint-disable require-await */
import test from 'ava'

import Joi from 'joi'
import { promises as fs } from 'fs'
import path from 'path'

import taube from '../lib/index.js'

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
process.env.TAUBE_UNIT_TESTS = true

let port
test.before(async() => {
  await taube.http.init() // this makes unit test cover 100%
  port = taube.http.getPort()
})

test('Should throw error when processing payloads larger than default threshold', async(t) => {
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
  const res = await t.throwsAsync(client.post('/test-file-upload-limit/upload', { payload }))

  t.is(res.statusCode, 413)
  t.is(res.message, 'Response code 413 (Payload Too Large)')
})

test('Should be able to process payloads which size is within the default 500kb limit', async(t) => {
  const file = await fs.readFile(path.resolve('./test/test-files/425kb.json'))
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
