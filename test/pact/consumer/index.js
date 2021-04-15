const taube = require('../../../lib')

const scooterClient = new taube.Client({
  uri: 'http://scooter'
})

const fleetClient = new taube.Client({
  uri: 'http://fleet'
})

async function getScooters() {
  return await scooterClient.get(`/scooters`)
}

async function getScooter(id) {
  return await scooterClient.get(`/scooters/${id}`)
}

async function getFleet(id) {
  return await fleetClient.get(`/fleets/${id}`)
}

module.exports = {
  scooterClient,
  fleetClient,
  getScooters,
  getScooter,
  getFleet
}
