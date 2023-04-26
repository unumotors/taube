import debugFactory from 'debug'

const debug = debugFactory('taube-mongo')

/**
 * Only shutdown mongoose if it is available.
 */
async function shutdown() {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const mymodule = await import('mongoose')
    const mongoose = mymodule?.default
    await mongoose?.disconnect()
    debug('Mongoose - disconnected')
  } catch (error) {
    debug('Error during mongoose shutdown. Might occur if mongoose is not installed and is expected.')
    debug(error)
  }
}

export default { shutdown }
