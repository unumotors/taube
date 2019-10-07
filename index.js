const got = require('got')
const express = require('express')
const serializeError = require('serialize-error');
const deserializeError = require('deserialize-error');
const cote = require('cote')

class Requester {
  constructor(options) {
    this.key = options.key
    if (!options.name) options.name = "Unnamed"
    this.cote = new cote.Requester(options)
  }
  async send(payload, callback) {
    const key = escape(this.key)
    let res
    try {
      res = await got(`http://${key}:3333/${payload.type}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
    } catch (error) {
      // If there are 404s use cote instead
      if (error.statusCode == 404) {
        if (callback) return this.cote.send(payload, callback)
        this.cote.send(payload)
      }
      throw error
    }
    res = JSON.parse(res.body)
    if (res._isError) {
      delete res._isError
      res = deserializeError(res)
      if (callback) return callback(res)
      throw res
    }
    if (callback) return callback(null, res)
    return res

  }
}


const app = express()
app.use(express.json())

app.listen(3333)

const occupied = {}

class Responder {
  constructor(options) {
    if (!options.name) options.name = "Unnamed"
    this.cote = new cote.Requester(options)
  }

  async on(name, fn) {
    this.cote.on(name, fn)
    name = escape(name)
    if (occupied[name]) throw new Error(`on ${name} is already occupied`)
    occupied[name] = true
    app.post(`/${name}`, (request, response) => {
      if (!fn) return
      function callback(err, res) {
        if (!err) return send(res)
        err._isError = true
        send(serializeError(err))
      }
      let sent = false
      function send(res) {
        if (sent) return
        res = JSON.stringify(res)
        response.send(res)
      }

      const rv = fn(request.body, callback)

      if (rv && typeof rv.then == 'function') {
        rv.then((res => send(res)))
          .catch(err => {
            err._isError = true
            return send(serializeError(err))
          })
      }
    })
  }
}

module.exports = {
    Requester,
    Responder,
    app
}
