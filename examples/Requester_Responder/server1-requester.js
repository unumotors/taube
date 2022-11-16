import taube from '../../lib/index.js'

const userRequester = new taube.Requester({
  key: 'users', // Key of responder from server2-responder.js
  uri: 'http://localhost', // URI of the responders server
})

async function getUser() {
  // This sends a request to the responder and awaits a response
  const res = await userRequester.send({ data: 'some data' })
  return res
}

getUser().catch((err) => console.log(err))
