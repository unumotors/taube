const express = require('express')
const config = require('./config')

// Setup express
const app = express()
app.use(express.json())
app.listen(config.http.port)

module.exports = app
