import httpHelper from '../http.js'

const { server } = httpHelper

export const readinessCheck = () => {
  if (!server.listening) {
    throw new Error('Server not running')
  }
}

export default { readinessCheck }
