import taube from '../../lib/index.js'

async function main() {
  taube.init()
  await taube.amqp.init()

  const publisher = new taube.Publisher({ key: 'users', brokerUri: 'amqp://guest:guest@localhost' })
  const userSubscriber = new taube.Subscriber({ key: 'users', brokerUri: 'amqp://guest:guest@localhost' })

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
