const { server } = require('../app')

module.exports.readinessCheck = () => {
  if (!server.listening) {
    throw new Error('Server not running')
  }
}
