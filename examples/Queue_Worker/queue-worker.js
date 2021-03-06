process.env.TAUBE_AMQP_URI = 'amqp://guest:guest@localhost'
const taube = require('../../lib')

async function main() {
  taube.init()
  await taube.amqp.init()

  // Queue
  const { Queue } = taube.QueueWorkerExponentialRetries

  const queue = new Queue('example-queue-1')
  await queue.enqueue({ some: 'data' })


  // Worker
  const { Worker } = taube.QueueWorkerExponentialRetries

  const worker = new Worker('example-queue-1', {
    worker: {
      prefetch: 2 // How many messages are consumed/fetched at once
    },
    errorHandler: ({
      error, message, payload, instance
    }) =>
      // e.g. send to Sentry
      console.error(
        error, // the thrown error
        message, // the original RabbitMQ message
        payload, // the containing payload
        instance // the Worker instance, can be used to get the name: instance.name
      )
  })

  let count = 0
  await worker.consume((data) => {
    if (count % 2 == 0) throw new Error('Something went wrong') // this message was not processed, it will be retried
    console.log(data)
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
