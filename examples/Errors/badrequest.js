import { Errors } from '../../lib/index.js'

function getScooter(vin) {
  if (!vin) {
    throw new Errors.BadRequest('scooter vin should be entered', { validation: 'vin is missing' })
  }
}

try {
  getScooter()
} catch (err) {
  console.error(err)
  process.exit(1)
}
