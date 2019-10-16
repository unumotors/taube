/* eslint-disable global-require */
const test = require('ava')

const converter = require('../helpers/converter')

test('converter works as expected', (t) => {
  t.is(converter.escape('test - test - test %&!"(/§&!/(?`!"§4'), 'test---test---test-%25%26%21%22%28/%A7%26%21/%28%3F%60%21%22%A74')
})
