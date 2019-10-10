/* eslint-disable global-require */
const test = require('ava')

const coteHttp = require('../')

test('req res model works with normal function', async(t) => {
  const responder = new coteHttp.Responder({ key: 'localhost' })
  const response = { type: 'test6', asd: 123 }

  responder.on('test6', async(req) => await req)
  const requester = new coteHttp.Requester({
    key: 'localhost',
    uri: 'http://localhost'
  })
  const res = await requester.send(response)
  t.deepEqual(res, response)
})

test('req res model works with promises', async(t) => {
  const responder = new coteHttp.Responder({ key: 'localhost' })
  const response = { type: 'test', asd: 123 }
  responder.on('test', async(req) => await req)

  const requester = new coteHttp.Requester({
    key: 'localhost',
    uri: 'http://localhost'
  })
  const res = await requester.send(response)
  t.deepEqual(res, response)
})

test('req res model works with promises when nothing is returned', async(t) => {
  const responder = new coteHttp.Responder({ key: 'localhost' })
  const response = { type: 'test12', asd: 123 }
  responder.on('test12', async() => {})

  const requester = new coteHttp.Requester({
    key: 'localhost',
    uri: 'http://localhost'
  })
  const res = await requester.send(response)
  t.is(res, undefined)
})

test('req res model works with promises and errors', async(t) => {
  const responder = new coteHttp.Responder({ key: 'localhost' })
  const response = { type: 'test4', asd: 123 }
  responder.on('test4', async() => {
    throw new Error('test')
  })

  const requester = new coteHttp.Requester({
    key: 'localhost',
    uri: 'http://localhost'
  })

  try {
    await requester.send(response)
    t.fail()
  } catch (error) {
    t.is(error.message, 'test')
  }
})

test('req res model works with callbacks', async(t) => {
  const responder = new coteHttp.Responder({ key: 'localhost' })
  const response = { type: 'test2', asd: 123 }
  responder.on('test2', (req, cb) => {
    cb(null, req)
  })

  const requester = new coteHttp.Requester({
    key: 'localhost',
    uri: 'http://localhost'
  })

  const res = await requester.send(response)
  t.deepEqual(res, response)
})

test('req res model works with callbacks and errors', async(t) => {
  const responder = new coteHttp.Responder({ key: 'localhost' })
  const response = { type: 'test3', asd: 123 }
  responder.on('test3', (req, cb) => {
    cb(new Error('woo'))
  })

  const requester = new coteHttp.Requester({
    key: 'localhost',
    uri: 'http://localhost'
  })

  try {
    await requester.send(response)
    t.fail()
  } catch (error) {
    t.is(error.message, 'woo')
  }
})

test.cb('req res model works with callbacks in send', (t) => {
  const responder = new coteHttp.Responder({ key: 'localhost' })
  const response = { type: 'test10', asd: 123 }
  responder.on('test10', (req, cb) => {
    cb(null, req)
  })

  const requester = new coteHttp.Requester({
    key: 'localhost',
    uri: 'http://localhost'
  })

  requester.send(response, (err, res) => {
    t.deepEqual(response, res)
    t.end()
  })
})

test('req res model works with number', async(t) => {
  const responder = new coteHttp.Responder({ key: 'localhost' })
  const request = { type: 'test9' }
  const res = 1
  responder.on('test9', async(req, cb) => res)

  const requester = new coteHttp.Requester({
    key: 'localhost',
    uri: 'http://localhost'
  })

  const res1 = await requester.send(request)
  t.is(res, res1)
})

test.cb('req res model responder use on with same name multiple times but only first registered is called', (t) => {
  const responder = new coteHttp.Responder({ key: 'localhost' })

  const name = '123145'
  t.plan(1)

  responder.on(name, () => {
    t.pass()
    t.end()
  })

  responder.on(name, () => {
    t.fail()
    t.end()
  })

  const requester = new coteHttp.Requester({
    key: 'localhost',
    uri: 'http://localhost'
  })

  requester.send({ type: name })
})

test('req res model responder cannot be called without all parameters', (t) => {
  const responder = new coteHttp.Responder({ key: 'localhost' })
  t.throws(() => {
    responder.on()
  }, 'Invalid first parameter, needs to be a string')
  t.throws(() => {
    responder.on(() => {})
  }, 'Invalid first parameter, needs to be a string')
  t.throws(() => {
    responder.on('asd')
  }, 'Invalid second parameter, needs to be function')
  t.throws(() => {
    responder.on('asd', '')
  }, 'Invalid second parameter, needs to be function')
})


test('req res model works with string', async(t) => {
  const responder = new coteHttp.Responder({ key: 'localhost' })
  const request = { type: 'test5' }
  const res = 'bla'
  responder.on('test5', async() => await res)

  const requester = new coteHttp.Requester({
    key: 'localhost',
    uri: 'http://localhost'
  })

  const res1 = await requester.send(request)
  t.is(res, res1)
})

test('req res model responder can handle null return value', async(t) => {
  const responder = new coteHttp.Responder({ key: 'localhost', name: 'test responder' })
  const request = { type: 'test13' }

  responder.on('test13', async() => await null)

  const requester = new coteHttp.Requester({
    key: 'localhost',
    name: 'test requester',
    uri: 'http://localhost'
  })

  const res1 = await requester.send(request)
  t.is(res1, null)
})

test('req res model responder hostname overwrite works', async(t) => {
  const responder = new coteHttp.Responder({ key: 'bla', name: 'test responder' })
  const request = { type: 'test43' }

  responder.on('test43', async() => await null)

  const requester = new coteHttp.Requester({
    key: 'bla',
    uri: 'http://localhost',
    name: 'test requester'
  })

  const res1 = await requester.send(request)
  t.is(res1, null)
})
