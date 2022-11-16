/* eslint-disable no-bitwise */
/* eslint-disable require-await */
/* eslint-disable global-require */
import test from 'ava'

import got from 'got'

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
delete process.env.TAUBE_UNIT_TESTS

test.serial('http.getPort() throws if taube.http is uninitialized.', async(t) => {
  const taube = await import('../lib/index.js')
  const err = await t.throws(() => {
    taube.http.getPort()
  })
  // eslint-disable-next-line max-len
  t.is(err.message, 'You need to initialize Taube HTTP before using HTTP based services (Add `taube.http.init()`. See README.md.')
})

test.serial('http.init() works as expected', async(t) => {
  const taube = await import('../lib/index.js')
  await taube.http.init() // this will actually await the server to listen
  await taube.http.init() // this will directly resolve as the previous call already initialized the server
  t.is(taube.http.server.listening, true)
  await t.throwsAsync(async() => {
    await got.get('http://localhost:4321/-/taube-metrics')
  }, { message: 'Response code 404 (Not Found)' }, 'does not expose metrics by default.')
})
