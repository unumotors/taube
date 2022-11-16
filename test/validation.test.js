import test from 'ava'
import taube from '../lib/index.js'

test('Taube exposes Joi', (t) => {
  t.truthy(taube.Joi)
})
