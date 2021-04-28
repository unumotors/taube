const test = require('ava')

const taube = require('../lib')

test('Server.post requires Joi validation', (t) => {
  const server = new taube.Server()

  t.throws(() => {
    server.post(
      `/willfail`,
      null,
      async() => {}
    )
  }, { message: 'Invalid second parameter, needs to be a Joi validation . Function needs to be third argument.' })

  t.throws(() => {
    server.post(
      `/willfail`,
      async() => {}
    )
  }, { message: 'Invalid second parameter, needs to be a Joi validation . Function needs to be third argument.' })
})

test('Server.checkParameters works as expected', (t) => {
  t.throws(() => {
    taube.Server.checkParameters()
  }, { message: 'Invalid first parameter, needs to be a string' })

  t.throws(() => {
    taube.Server.checkParameters('/scooters')
  }, { message: 'Invalid second parameter, needs to be a Joi validation . Function needs to be third argument.' })

  t.throws(() => {
    taube.Server.checkParameters('/scooters', 'string')
  }, { message: 'Invalid second parameter, needs to be a Joi validation . Function needs to be third argument.' })

  t.throws(() => {
    taube.Server.checkParameters('/scooters', {})
  }, { message: 'Invalid third parameter, needs to be function' })

  t.throws(() => {
    taube.Server.checkParameters('/scooters', {}, 'string')
  }, { message: 'Invalid third parameter, needs to be function' })

  t.notThrows(() => {
    taube.Server.checkParameters('/scooters', {}, () => {})
  })
})

test('Server.get requires Joi validation', (t) => {
  const server = new taube.Server()

  t.throws(() => {
    server.get(
      `/willfail`,
      null,
      async() => {}
    )
  }, { message: 'Invalid second parameter, needs to be a Joi validation . Function needs to be third argument.' })

  t.throws(() => {
    server.get(
      `/willfail`,
      async() => {}
    )
  }, { message: 'Invalid second parameter, needs to be a Joi validation . Function needs to be third argument.' })
})

test('Server.paginate requires Joi validation', (t) => {
  const server = new taube.Server()

  t.throws(() => {
    server.paginate(
      `/willfail`,
      null,
      async() => {}
    )
  }, { message: 'Invalid second parameter, needs to be a Joi validation . Function needs to be third argument.' })

  t.throws(() => {
    server.paginate(
      `/willfail`,
      async() => {}
    )
  }, { message: 'Invalid second parameter, needs to be a Joi validation . Function needs to be third argument.' })
})


test('Server declaration require path to start with /', (t) => {
  const server = new taube.Server()

  t.throws(() => {
    server.get(
      `willfail`,
      { params: {} },
      async() => {}
    )
  }, { message: 'This path: "willfail" is invalid. Path must start with "/"' })
})
