const { Errors } = require('../../lib')

function getScooter(vin) {
  if (!vin) {
    // creat error object by using statusCode
    throw new Errors[404]('scooter vin should be entered', { validation: 'vin is missing' })
  }
}

try {
  getScooter()
} catch (err) {
  console.error(err)
  process.exit(1)
}
