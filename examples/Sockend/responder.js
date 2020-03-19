const taube = require('../../lib')

const userResponder = new taube.Responder({
  key: 'users',
  // All endpoints that should be exposed publically by the Sockend need an entry here
  sockendWhitelist: ['login']
})

userResponder.on('login', async(req) => {
  const { data } = req
  const returnValue = await new Promise(resolve => resolve(data)) // Do something
  return returnValue
})

// This endpoint is NOT exposed through the Sockend, as the userResponder
// does not have a 'private stuff' entry
userResponder.on('private stuff', () => null)

