/* eslint-disable no-bitwise */
/* eslint-disable require-await */
/* eslint-disable global-require */
const test = require('ava')

process.env.NODE_ENV = 'development' // Overwrite ava to be able to unit test
delete process.env.TAUBE_UNIT_TESTS

test('http.listen() works as expected', async(t) => {
  const taube = require('../lib')
  await taube.http.listen() // this will actually await the server to listen
  await taube.http.listen() // this will directly resolve
  t.is(taube.http.server.listening, true)
})
