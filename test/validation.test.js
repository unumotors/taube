const test = require('ava')

const taube = require('../lib')

test('Taube exposes Joi', (t) => {
  t.truthy(taube.Joi)
})
