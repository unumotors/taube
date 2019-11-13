const { server } = require('../http')

module.exports.readinessCheck = () => {
  if (!server.listening) {
    throw new Error('Server not running')
  }
}
