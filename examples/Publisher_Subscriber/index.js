process.env.TAUBE_HTTP_ENABLED = true
process.env.TAUBE_AMQP_URI = 'amqp://guest:guest@localhost'
const taube = require('../../lib')

taube.init()

const publisher = new taube.Publisher({ key: 'users' })

const userSubscriber = new taube.Subscriber({ key: 'users' })

async function main() {
  await userSubscriber.on('users updated', (req) => {
    try {
      const { data } = req
      console.log(data)
      process.exit(0) // Only to make this example stop
    } catch (error) {
      console.error(error)
    }
  })

  await publisher.publish(`users updated`, { data: {} })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
