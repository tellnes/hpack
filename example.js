
const Encoder = require('./').Encoder
const Decoder = require('./').Decoder
const assert = require('assert')

var encoder = new Encoder()
var decoder = new Decoder()

decoder.on('header', function(name, value) {
  console.log(name, value)
})

encoder.set(':method', 'GET')
encoder.set(':scheme', 'http')
encoder.set(':path', '/')
encoder.set(':authority', 'www.example.com')

var payload = encoder.read()

decoder.write(payload)
