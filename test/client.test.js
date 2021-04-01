const test = require('ava')

const taube = require('../lib')

test('Client component fails if required parameters are not passed', async(t) => {
  await t.throws(() => {
    // eslint-disable-next-line no-new
    new taube.Client({})
  }, { message: 'Missing required "uri" parameter in Requester initialization.' })
})

