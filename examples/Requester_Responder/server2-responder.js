const taube = require('../../lib')

taube.http.init()
const userResponder = new taube.Responder({ key: 'users' })

userResponder.on('get users', async(req) => {
  const { data } = req
  const returnValue = await new Promise((resolve) => { resolve(data) }) // Do something
  return returnValue
})
