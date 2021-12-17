process.env.TAUBE_AMQP_URI = 'amqp://guest:guest@localhost'
const taube = require('../../lib')

async function main() {
  taube.init()
  await taube.amqp.init()

  const publisher = new taube.Publisher({ key: 'users' })
  const userSubscriber = new taube.Subscriber({ key: 'users' })

  await userSubscriber.on('users updated', (req) => {
    try {
      const { data } = req
      console.log(data)
      process.exit(0) // Only to make this example stop
    } catch (error) {
      console.error(error)
    }
  })

  await publisher.publish('users updated', { data: { user: 'updated' } })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
