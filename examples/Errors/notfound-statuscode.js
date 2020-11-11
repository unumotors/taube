const { Errors } = require('../../lib')

function main() {
  const data = 'vin not found'
  // creat error object by using statusCode
  throw new Errors[404](data)
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
