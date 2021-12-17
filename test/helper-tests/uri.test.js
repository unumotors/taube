const test = require('ava')
const uriHelper = require('../../lib/helpers/uri')

test('fixClientURI() does work as expected', (t) => {
  t.is(uriHelper.fixClientURI(), undefined)
  t.is(uriHelper.fixClientURI('/scooter/'), '/scooter') // removed /
  t.is(uriHelper.fixClientURI('/scooter'), '/scooter')
  t.is(uriHelper.fixClientURI('scooter'), 'scooter')
})

test('validatePath() does work as expected', (t) => {
  t.is(uriHelper.validatePath(), undefined)
  t.is(uriHelper.validatePath('/scooter/'), '/scooter/')
  t.is(uriHelper.validatePath('/scooter'), '/scooter')
  t.throws(
    () => uriHelper.validatePath('scooter'),
    { message: 'This path: "scooter" is invalid. Path must start with "/"' },
  )
})
