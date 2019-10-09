const express = require('express')
const config = require('../config')

// Setup express
const app = express()
app.use(express.json())

try {
  app.listen(config.http.port)
} catch (error) {
  console.log('Cannot setup server')
  console.log(error)
  process.exit(1)
}

module.exports = app
