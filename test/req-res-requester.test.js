import test from 'ava'
import fs from 'node:fs'
import esmock from 'esmock'
import taube from '../lib/index.js'

const pkg = JSON.parse(fs.readFileSync('package.json'))

let Requester
test.before(async() => {
  Requester = await esmock('../lib/components/requester', {
    got: async(uri, options) => await ({ body: JSON.stringify({ uri, options }) }),
  })
  await taube.http.init()
})

test('requester should set user-agent header correctly', async(t) => {
  const requester = new Requester({
    key: 'localhost',
    name: 'test requester',
    uri: 'http://localhost',
  })

  const response = await requester.send({ type: 'test' })
  t.is(response.options.headers['user-agent'], `@cloud/taube@${pkg.version} Requester`)

  const requester2 = new Requester({
    key: 'localhost',
    name: 'test requester',
    uri: 'http://localhost',
    userAgentComponent: 'Test Component',
  })

  const response2 = await requester2.send({ type: 'test' })
  t.is(response2.options.headers['user-agent'], `@cloud/taube@${pkg.version} Test Component`)
})

test('requester should set whitelist header correctly', async(t) => {
  const requester = new Requester({
    key: 'localhost',
    name: 'test requester',
    uri: 'http://localhost',
  })

  const response = await requester.sendWithOptions({ type: 'test' }, { useWhitelist: true })
  t.is(response.options.headers['x-use-whitelist'], true)
})
