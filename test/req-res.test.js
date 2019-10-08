const test = require('ava')

const coteHttp = require('../index')
const cote = require('cote')

test('req res model works with normal function', async(t) => {
    const responder = new coteHttp.Responder({ key: 'localhost' })
    const response = { type: 'test6', asd: 123 }

    responder.on('test6', async (req) => {
        return req
    })

    const requester = new coteHttp.Requester({
        key: 'localhost'
    })
    const res = await requester.send(response)
    t.deepEqual(res, response)
})

test('req res model works with promises', async(t) => {
    const responder = new coteHttp.Responder({ key: 'localhost' })
    const response = { type: 'test', asd: 123 }
    responder.on('test', async(req) => {
        return req
    })

    const requester = new coteHttp.Requester({
        key: 'localhost'
    })
    const res = await requester.send(response)
    t.deepEqual(res, response)
})

test('req res model works with promises and errors', async(t) => {
    const responder = new coteHttp.Responder({ key: 'localhost' })
    const response = { type: 'test4', asd: 123 }
    responder.on('test4', async(req) => {
        throw new Error('test')
    })

    const requester = new coteHttp.Requester({
        key: 'localhost'
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
        key: 'localhost'
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
        key: 'localhost'
    })

    try {
        await requester.send(response)
        t.fail()
    } catch (error) {
        t.pass()
    }
})

test.cb('req res model works with callbacks in send', (t) => {
    const responder = new coteHttp.Responder({ key: 'localhost' })
    const response = { type: 'test10', asd: 123 }
    responder.on('test10', (req, cb) => {
        cb(null, req)
    })

    const requester = new coteHttp.Requester({
        key: 'localhost'
    })

    requester.send(response, (err, res) => {
        t.deepEqual(response, res)
		t.end();
    })
})

test('req res model works with number', async(t) => {
    const responder = new coteHttp.Responder({ key: 'localhost' })
    const request = { type: 'test9'  }
    const res = 1
    responder.on('test9', async (req, cb) => {
        return res
    })

    const requester = new coteHttp.Requester({
        key: 'localhost'
    })

    try {
        const res1 = await requester.send(request)
        t.is(res, res1)
    } catch (error) {
        t.pass()
    }
})

test('req res model works with string', async(t) => {
    const responder = new coteHttp.Responder({ key: 'localhost'  })
    const request = { type: 'test5'  }
    const res = 'bla'
    responder.on('test5', async (req, cb) => {
        return res
    })

    const requester = new coteHttp.Requester({
        key: 'localhost'
    })

    try {
        const res1 = await requester.send(request)
        t.is(res, res1)
    } catch (error) {
        t.pass()
    }
})

test.only('req res model does fallback to cote', async(t) => {
    const responder = new cote.Responder({ key: 'localhost', name: 'test responder' })
    const request = { type: 'test10' }
    const res = 'bla'
    responder.on('test10', (res, cb) => {
        cb(res)
    })

    const requester = new coteHttp.Requester({
        key: 'localhost',
        name: 'test requester'
    })

    try {
        const res1 = await requester.send(request)
        t.is(res, res1)
    } catch (error) {
        t.pass()
    }
})
