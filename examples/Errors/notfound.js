import { Errors } from '../../lib/index.js'

function getScooter() {
  throw new Errors.NotFound('vin not found', { details: 'vin abcde not found' })
}

try {
  getScooter()
} catch (err) {
  console.error(err)
  process.exit(1)
}
