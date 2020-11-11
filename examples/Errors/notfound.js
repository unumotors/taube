const { Errors } = require('../../lib')

function main() {
  const data = {
    'errorMsg': 'vin not found'
  } // this can be string
  throw new Errors.NotFound(data)
}

try {
  main()
} catch (err) {
  const {
    name, statusCode, data
  } = err
  console.error('name: ', name)
  console.error('statusCode: ', statusCode)
  console.error('data: ', JSON.stringify(data, null, 2))

  process.exit(1)
}
