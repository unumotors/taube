const { Client } = require('../../lib')

const client = new Client({
  uri: 'http://localhost', // uri of the server, e.g. http://scooter
})

async function getScooter(id) {
  const scooter = await client.get(`/scooters/${id}`, { query: { type: 'UNU2' } })
  return scooter
}

async function createScooter(body) {
  const scooter = await client.post('/scooters', body)
  return scooter
}
async function updateScooter(id, body) {
  const scooter = await client.put(`/scooters/${id}`, body)
  return scooter
}
async function deleteScooter(id) {
  const scooter = await client.delete(`/scooters/${id}`)
  return scooter
}

getScooter('123').catch((err) => console.log(err))

createScooter({ vin: '123' }).catch((err) => console.log(err))

updateScooter('123', { online: true }).catch((err) => console.log(err))

deleteScooter('123').catch((err) => console.log(err))
