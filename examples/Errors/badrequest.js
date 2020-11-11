const { Errors } = require('../../lib')

function main() {
  const data = 'scooter vin should be entered' // this can be json
  const validation = 'vin is missing'
  throw new Errors.BadRequest(data, validation)
}

try {
  main()
} catch (err) {
  const {
    name, statusCode, data, validation
  } = err
  console.error('name: ', name)
  console.error('statusCode: ', statusCode)
  console.error('data: ', data)
  console.error('validation: ', validation)

  process.exit(1)
}
