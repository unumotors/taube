const test = require('ava')
const uriHelper = require('../../lib/helpers/uri')

test('fixClientURI() does work as expected', t => {
  t.is(uriHelper.fixClientURI(), undefined)
  t.is(uriHelper.fixClientURI('/scooter/'), '/scooter') // removed /
  t.is(uriHelper.fixClientURI('/scooter'), '/scooter')
  t.is(uriHelper.fixClientURI('scooter'), 'scooter')
})

test('fixServerPath() does work as expected', t => {
  t.is(uriHelper.fixServerPath(), undefined)
  t.is(uriHelper.fixServerPath('/scooter/'), '/scooter/')
  t.is(uriHelper.fixServerPath('/scooter'), '/scooter')
  t.is(uriHelper.fixServerPath('scooter'), '/scooter') // added /
})
