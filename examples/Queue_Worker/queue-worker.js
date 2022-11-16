import taube from '../../lib/index.js'

async function main() {
  taube.init()
  await taube.amqp.init()

  // Queue
  const { Queue } = taube.QueueWorkerExponentialRetries

  const queue = new Queue('example-queue-1', { brokerUri: 'amqp://guest:guest@localhost' })
  await queue.enqueue({ some: 'data' })

  // Worker
  const { Worker } = taube.QueueWorkerExponentialRetries

  const worker = new Worker('example-queue-1', {
    brokerUri: 'amqp://guest:guest@localhost',
    worker: {
      prefetch: 2, // How many messages are consumed/fetched at once
    },
    errorHandler: ({
      error, message, payload, instance,
    }) => console.error( // // e.g. send to Sentry
      error, // the thrown error
      message, // the original RabbitMQ message
      payload, // the containing payload
      instance, // the Worker instance, can be used to get the name: instance.name
    ),
  })

  const count = 0
  await worker.consume((data, headers, message) => {
    if (count % 2 == 0) throw new Error('Something went wrong') // this message was not processed, it will be retried
    console.log(data) // Actual payload
    console.log(headers) // Headers
    console.log(message) // Original AMQPlib meta object with additional data
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
