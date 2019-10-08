const got = require('got')
const express = require('express')
const serializeError = require('serialize-error');
const deserializeError = require('deserialize-error');

const cote = require('@cloud/cote')

class Requester {
  constructor(options, discoveryOptions = {}) {
    this.key = options.key
    if (!options.name) options.name = "Unnamed"
    this.cote = new cote.Requester(options, { log:false, ...discoveryOptions })
  }
  async send(payload, callback) {
    const key = escape(this.key)
    let httpRes
    // Try to communicate over http
    try {
      httpRes = await got(`http://${key}:3333/${payload.type}`, {
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
        return this.cote.send(payload)
      }

      throw error
    }

    let res
    // If response contains data, parse it
    if (httpRes.body != '') {
      res = JSON.parse(httpRes.body)
      // Deserialize error
      if (res._isError) {
        delete res._isError
        res = deserializeError(res)
        if (callback) return callback(res)
        throw res
      }
    }

    // Return answer
    if (callback) return callback(null, res)
    return res

  }
}


const app = express()
app.use(express.json())

app.listen(3333)

const occupiedOn = {}

let responder

class Responder {
  constructor(options, discoveryOptions = {}) {
    if (!options.name) options.name = "Unnamed"
    if (!responder) {
      responder = new cote.Responder(options, { log: false, ...discoveryOptions})
    } else if (responder.advertisement.key != `$$${options.key}`) {
      throw new Error('One service can only have a single "key". All Responders need to have that key')
    }
  }

  on(name, fn) {
    // Validate expected inputs
    if (!name || typeof name != 'string')  throw new Error('Invalid first parameter, needs to be a string')
    if (!fn || typeof fn != 'function')  throw new Error('Invalid second parameter, needs to be function')
    // Check if this name is occupied already
    if (occupiedOn[name]) throw new Error(`on(${name},fn) is already occupied`)
    occupiedOn[name] = true
    // Setup this also in cote
    responder.on(name, fn)
    name = escape(name)
    // Setup express endpoint
    app.post(`/${name}`, (request, response) => {
      function callback(err, res) {
        if (!err) return send(res)
        err._isError = true
        send(serializeError(err))
      }

      let sent = false
      function send(res) {
        if (sent) return // Make sure always only called once
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
