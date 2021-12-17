// checks the given condition
// every 100 milliseconds as the default frequency.
// this check would hang if tests are not run with --timeout
const waitUntil = async(condition, frequency = 100) => {
  await new Promise((resolve) => {
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval)
        resolve()
      }
    }, frequency)
  })
}

module.exports = {
  waitUntil,
}
