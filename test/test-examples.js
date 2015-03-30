'use strict'

const Encoder = require('../').Encoder
const Decoder = require('../').Decoder
const assert = require('assert')

var encoder
var decoder
var headers = []

function createEncoder(size) {
  encoder = new Encoder(size)
}

function createDecoder(size) {
  decoder = new Decoder(size)
  decoder.on('header', function(name, value, rep) {
    headers.push(name, value, rep)
  })
}

var exp
var buf

// C.1 Integer Representation Examples

createEncoder()


// C.1.1 Example 1: Encoding 10 Using a 5-bit Prefix

encoder.number(10, 5, false)
assert.deepEqual(encoder.read(), new Buffer([ 10 ]))


// C.1.2 Example 2: Encoding 1337 Using a 5-bit Prefix

encoder.number(1337, 5, false)
assert.deepEqual(encoder.read(), new Buffer([ 31, 154, 10 ]))


// C.1.3 Example 3: Encoding 42 Starting at an Octet Boundary

encoder.number(42, 8, false)
assert.deepEqual(encoder.read(), new Buffer([ 42 ]))

// C.2 Header Field Representation Examples

// C.2.1 Literal Header Field with Indexing

createEncoder()
createDecoder()

encoder.set('custom-key', 'custom-header', { huffman: false })
exp = new Buffer('400a637573746f6d2d6b65790d637573746f6d2d686561646572', 'hex')
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 1)
assert.equal(encoder.table.table[0].name, 'custom-key')
assert.equal(encoder.table.table[0].value, 'custom-header')
assert.equal(encoder.table.size, 55)

decoder.write(buf)
exp =
  [ 'custom-key'
  , 'custom-header'
  , Decoder.REP_INCREMENTAL_INDEXING
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.2.2 Literal Header Field without Indexing

createEncoder()
createDecoder()

encoder.set(':path', '/sample/path', { index: false, huffman: false })
exp = new Buffer('040c2f73616d706c652f70617468', 'hex')
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 0)
assert.equal(encoder.table.size, 0)

decoder.write(buf)
exp =
  [ ':path'
  , '/sample/path'
  , Decoder.REP_WITHOUT_INDEXING
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.2.3 Literal Header Field never Indexed

createEncoder()
createDecoder()

encoder.set('password', 'secret', { index: 'never', huffman: false })
exp = new Buffer('100870617373776f726406736563726574', 'hex')
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 0)
assert.equal(encoder.table.size, 0)

decoder.write(buf)
exp =
  [ 'password'
  , 'secret'
  , Decoder.REP_NEVER_INDEXED
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.2.4 Indexed Header Field

createEncoder()
createDecoder()

encoder.set(':method', 'GET', { })
exp = new Buffer([ 0x82 ])
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 0)
assert.equal(encoder.table.size, 0)

decoder.write(buf)
exp =
  [ ':method'
  , 'GET'
  , Decoder.REP_INDEXED
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.3 Request Examples without Huffman Coding

createEncoder()
createDecoder()

// C.3.1 First Request

encoder.set(':method', 'GET')
encoder.set(':scheme', 'http')
encoder.set(':path', '/')
encoder.set(':authority', 'www.example.com', { huffman: false })
exp = new Buffer('828684410f7777772e6578616d706c652e636f6d', 'hex')
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 1)
assert.equal(encoder.table.table[0].name, ':authority')
assert.equal(encoder.table.table[0].value, 'www.example.com')
assert.equal(encoder.table.size, 57)

decoder.write(buf)
exp =
  [ ':method', 'GET', Decoder.REP_INDEXED
  , ':scheme', 'http', Decoder.REP_INDEXED
  , ':path', '/', Decoder.REP_INDEXED
  , ':authority', 'www.example.com', Decoder.REP_INCREMENTAL_INDEXING
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.3.2 Second Request

encoder.set(':method', 'GET')
encoder.set(':scheme', 'http')
encoder.set(':path', '/')
encoder.set(':authority', 'www.example.com')
encoder.set('cache-control', 'no-cache', { huffman: false })
exp = new Buffer('828684be58086e6f2d6361636865', 'hex')
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 2)
assert.equal(encoder.table.table[0].name, 'cache-control')
assert.equal(encoder.table.table[0].value, 'no-cache')
assert.equal(encoder.table.table[1].name, ':authority')
assert.equal(encoder.table.table[1].value, 'www.example.com')
assert.equal(encoder.table.size, 110)

decoder.write(buf)
exp =
  [ ':method', 'GET', Decoder.REP_INDEXED
  , ':scheme', 'http', Decoder.REP_INDEXED
  , ':path', '/', Decoder.REP_INDEXED
  , ':authority', 'www.example.com', Decoder.REP_INDEXED
  , 'cache-control', 'no-cache', Decoder.REP_INCREMENTAL_INDEXING
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.3.3 Third Request

encoder.set(':method', 'GET')
encoder.set(':scheme', 'https')
encoder.set(':path', '/index.html')
encoder.set(':authority', 'www.example.com')
encoder.set('custom-key', 'custom-value', { huffman: false })
exp = new Buffer( '828785bf400a637573746f6d2d6b65790c637573746f6d2d76616c7565'
                , 'hex'
                )
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 3)
assert.equal(encoder.table.table[0].name, 'custom-key')
assert.equal(encoder.table.table[0].value, 'custom-value')
assert.equal(encoder.table.table[1].name, 'cache-control')
assert.equal(encoder.table.table[1].value, 'no-cache')
assert.equal(encoder.table.table[2].name, ':authority')
assert.equal(encoder.table.table[2].value, 'www.example.com')
assert.equal(encoder.table.size, 164)

decoder.write(buf)
exp =
  [ ':method', 'GET', Decoder.REP_INDEXED
  , ':scheme', 'https', Decoder.REP_INDEXED
  , ':path', '/index.html', Decoder.REP_INDEXED
  , ':authority', 'www.example.com', Decoder.REP_INDEXED
  , 'custom-key', 'custom-value', Decoder.REP_INCREMENTAL_INDEXING
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.4 Request Examples with Huffman Coding

createEncoder()
createDecoder()

// C.4.1 First Request

encoder.set(':method', 'GET')
encoder.set(':scheme', 'http')
encoder.set(':path', '/')
encoder.set(':authority', 'www.example.com')
exp = new Buffer('828684418cf1e3c2e5f23a6ba0ab90f4ff', 'hex')
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 1)
assert.equal(encoder.table.table[0].name, ':authority')
assert.equal(encoder.table.table[0].value, 'www.example.com')
assert.equal(encoder.table.size, 57)

decoder.write(buf)
exp =
  [ ':method', 'GET', Decoder.REP_INDEXED
  , ':scheme', 'http', Decoder.REP_INDEXED
  , ':path', '/', Decoder.REP_INDEXED
  , ':authority', 'www.example.com', Decoder.REP_INCREMENTAL_INDEXING
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.4.2 Second Request

encoder.set(':method', 'GET')
encoder.set(':scheme', 'http')
encoder.set(':path', '/')
encoder.set(':authority', 'www.example.com')
encoder.set('cache-control', 'no-cache')
exp = new Buffer('828684be5886a8eb10649cbf', 'hex')
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 2)
assert.equal(encoder.table.table[0].name, 'cache-control')
assert.equal(encoder.table.table[0].value, 'no-cache')
assert.equal(encoder.table.table[1].name, ':authority')
assert.equal(encoder.table.table[1].value, 'www.example.com')
assert.equal(encoder.table.size, 110)

decoder.write(buf)
exp =
  [ ':method', 'GET', Decoder.REP_INDEXED
  , ':scheme', 'http', Decoder.REP_INDEXED
  , ':path', '/', Decoder.REP_INDEXED
  , ':authority', 'www.example.com', Decoder.REP_INDEXED
  , 'cache-control', 'no-cache', Decoder.REP_INCREMENTAL_INDEXING
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.3.3 Third Request

encoder.set(':method', 'GET')
encoder.set(':scheme', 'https')
encoder.set(':path', '/index.html')
encoder.set(':authority', 'www.example.com')
encoder.set('custom-key', 'custom-value')
exp = new Buffer('828785bf408825a849e95ba97d7f8925a849e95bb8e8b4bf', 'hex')
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 3)
assert.equal(encoder.table.table[0].name, 'custom-key')
assert.equal(encoder.table.table[0].value, 'custom-value')
assert.equal(encoder.table.table[1].name, 'cache-control')
assert.equal(encoder.table.table[1].value, 'no-cache')
assert.equal(encoder.table.table[2].name, ':authority')
assert.equal(encoder.table.table[2].value, 'www.example.com')
assert.equal(encoder.table.size, 164)

decoder.write(buf)
exp =
  [ ':method', 'GET', Decoder.REP_INDEXED
  , ':scheme', 'https', Decoder.REP_INDEXED
  , ':path', '/index.html', Decoder.REP_INDEXED
  , ':authority', 'www.example.com', Decoder.REP_INDEXED
  , 'custom-key', 'custom-value', Decoder.REP_INCREMENTAL_INDEXING
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.5 Response Examples without Huffman Coding

createEncoder(256)
createDecoder(256)

// C.5.1 First Response

encoder.set(':status', '302', { huffman: false })
encoder.set('cache-control', 'private', { huffman: false })
encoder.set('date', 'Mon, 21 Oct 2013 20:13:21 GMT', { huffman: false })
encoder.set('location', 'https://www.example.com', { huffman: false })
exp = new Buffer('4803333032580770726976617465611d4d6f6e2c203231204f637420323' +
                 '031332032303a31333a323120474d546e1768747470733a2f2f7777772e' +
                 '6578616d706c652e636f6d', 'hex')
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 4)
assert.equal(encoder.table.table[0].name, 'location')
assert.equal(encoder.table.table[0].value, 'https://www.example.com')
assert.equal(encoder.table.table[1].name, 'date')
assert.equal(encoder.table.table[1].value, 'Mon, 21 Oct 2013 20:13:21 GMT')
assert.equal(encoder.table.table[2].name, 'cache-control')
assert.equal(encoder.table.table[2].value, 'private')
assert.equal(encoder.table.table[3].name, ':status')
assert.equal(encoder.table.table[3].value, '302')
assert.equal(encoder.table.size, 222)

decoder.write(buf)
exp =
  [ ':status', '302', Decoder.REP_INCREMENTAL_INDEXING
  , 'cache-control', 'private', Decoder.REP_INCREMENTAL_INDEXING
  , 'date', 'Mon, 21 Oct 2013 20:13:21 GMT', Decoder.REP_INCREMENTAL_INDEXING
  , 'location', 'https://www.example.com', Decoder.REP_INCREMENTAL_INDEXING
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.5.2 Second Response

encoder.set(':status', '307', { huffman: false })
encoder.set('cache-control', 'private', { huffman: false })
encoder.set('date', 'Mon, 21 Oct 2013 20:13:21 GMT', { huffman: false })
encoder.set('location', 'https://www.example.com', { huffman: false })
exp = new Buffer('4803333037c1c0bf', 'hex')
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 4)
assert.equal(encoder.table.table[0].name, ':status')
assert.equal(encoder.table.table[0].value, '307')
assert.equal(encoder.table.table[1].name, 'location')
assert.equal(encoder.table.table[1].value, 'https://www.example.com')
assert.equal(encoder.table.table[2].name, 'date')
assert.equal(encoder.table.table[2].value, 'Mon, 21 Oct 2013 20:13:21 GMT')
assert.equal(encoder.table.table[3].name, 'cache-control')
assert.equal(encoder.table.table[3].value, 'private')
assert.equal(encoder.table.size, 222)

decoder.write(buf)
exp =
  [ ':status', '307', Decoder.REP_INCREMENTAL_INDEXING
  , 'cache-control', 'private', Decoder.REP_INDEXED
  , 'date', 'Mon, 21 Oct 2013 20:13:21 GMT', Decoder.REP_INDEXED
  , 'location', 'https://www.example.com', Decoder.REP_INDEXED
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.5.3 Third Response

encoder.set(':status', '200', { huffman: false })
encoder.set('cache-control', 'private', { huffman: false })
encoder.set('date', 'Mon, 21 Oct 2013 20:13:22 GMT', { huffman: false })
encoder.set('location', 'https://www.example.com', { huffman: false })
encoder.set('content-encoding', 'gzip', { huffman: false })
encoder.set('set-cookie'
          , 'foo=ASDJKHQKBZXOQWEOPIUAXQWEOIU; max-age=3600; version=1'
          , { huffman: false }
          )
exp = new Buffer('88c1611d4d6f6e2c203231204f637420323031332032303a31333a32322' +
                 '0474d54c05a04677a69707738666f6f3d4153444a4b48514b425a584f51' +
                 '57454f50495541585157454f49553b206d61782d6167653d333630303b2' +
                 '076657273696f6e3d31', 'hex')
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 3)
assert.equal(encoder.table.table[0].name, 'set-cookie')
assert.equal(encoder.table.table[0].value
    , 'foo=ASDJKHQKBZXOQWEOPIUAXQWEOIU; max-age=3600; version=1')
assert.equal(encoder.table.table[1].name, 'content-encoding')
assert.equal(encoder.table.table[1].value, 'gzip')
assert.equal(encoder.table.table[2].name, 'date')
assert.equal(encoder.table.table[2].value, 'Mon, 21 Oct 2013 20:13:22 GMT')
assert.equal(encoder.table.size, 215)

decoder.write(buf)
exp =
  [ ':status', '200', Decoder.REP_INDEXED
  , 'cache-control', 'private', Decoder.REP_INDEXED
  , 'date', 'Mon, 21 Oct 2013 20:13:22 GMT', Decoder.REP_INCREMENTAL_INDEXING
  , 'location', 'https://www.example.com', Decoder.REP_INDEXED
  , 'content-encoding', 'gzip', Decoder.REP_INCREMENTAL_INDEXING
  , 'set-cookie', 'foo=ASDJKHQKBZXOQWEOPIUAXQWEOIU; max-age=3600; version=1'
      , Decoder.REP_INCREMENTAL_INDEXING
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.6 Response Examples with Huffman Coding

createEncoder(256)
createDecoder(256)

// C.6.1 First Response
encoder.set(':status', '302', { huffman: true })
encoder.set('cache-control', 'private', { huffman: true })
encoder.set('date', 'Mon, 21 Oct 2013 20:13:21 GMT', { huffman: true })
encoder.set('location', 'https://www.example.com', { huffman: true })
exp = new Buffer('488264025885aec3771a4b6196d07abe941054d444a8200595040b8166e' +
                 '082a62d1bff6e919d29ad171863c78f0b97c8e9ae82ae43d3', 'hex')
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 4)
assert.equal(encoder.table.table[0].name, 'location')
assert.equal(encoder.table.table[0].value, 'https://www.example.com')
assert.equal(encoder.table.table[1].name, 'date')
assert.equal(encoder.table.table[1].value, 'Mon, 21 Oct 2013 20:13:21 GMT')
assert.equal(encoder.table.table[2].name, 'cache-control')
assert.equal(encoder.table.table[2].value, 'private')
assert.equal(encoder.table.table[3].name, ':status')
assert.equal(encoder.table.table[3].value, '302')
assert.equal(encoder.table.size, 222)

decoder.write(buf)
exp =
  [ ':status', '302', Decoder.REP_INCREMENTAL_INDEXING
  , 'cache-control', 'private', Decoder.REP_INCREMENTAL_INDEXING
  , 'date', 'Mon, 21 Oct 2013 20:13:21 GMT', Decoder.REP_INCREMENTAL_INDEXING
  , 'location', 'https://www.example.com', Decoder.REP_INCREMENTAL_INDEXING
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.6.2 Second Response

encoder.set(':status', '307', { huffman: true })
encoder.set('cache-control', 'private', { huffman: true })
encoder.set('date', 'Mon, 21 Oct 2013 20:13:21 GMT', { huffman: true })
encoder.set('location', 'https://www.example.com', { huffman: true })
exp = new Buffer('4883640effc1c0bf', 'hex')
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 4)
assert.equal(encoder.table.table[0].name, ':status')
assert.equal(encoder.table.table[0].value, '307')
assert.equal(encoder.table.table[1].name, 'location')
assert.equal(encoder.table.table[1].value, 'https://www.example.com')
assert.equal(encoder.table.table[2].name, 'date')
assert.equal(encoder.table.table[2].value, 'Mon, 21 Oct 2013 20:13:21 GMT')
assert.equal(encoder.table.table[3].name, 'cache-control')
assert.equal(encoder.table.table[3].value, 'private')
assert.equal(encoder.table.size, 222)

decoder.write(buf)
exp =
  [ ':status', '307', Decoder.REP_INCREMENTAL_INDEXING
  , 'cache-control', 'private', Decoder.REP_INDEXED
  , 'date', 'Mon, 21 Oct 2013 20:13:21 GMT', Decoder.REP_INDEXED
  , 'location', 'https://www.example.com', Decoder.REP_INDEXED
  ]
assert.deepEqual(headers, exp)
headers.length = 0


// C.6.3 Third Response

encoder.set(':status', '200', { huffman: true })
encoder.set('cache-control', 'private', { huffman: true })
encoder.set('date', 'Mon, 21 Oct 2013 20:13:22 GMT', { huffman: true })
encoder.set('location', 'https://www.example.com', { huffman: true })
encoder.set('content-encoding', 'gzip', { huffman: true })
encoder.set('set-cookie'
          , 'foo=ASDJKHQKBZXOQWEOPIUAXQWEOIU; max-age=3600; version=1'
          , { huffman: true }
          )
exp = new Buffer('88c16196d07abe941054d444a8200595040b8166e084a62d1bffc05a839' +
                 'bd9ab77ad94e7821dd7f2e6c7b335dfdfcd5b3960d5af27087f3672c1ab' +
                 '270fb5291f9587316065c003ed4ee5b1063d5007', 'hex')
buf = encoder.read()
assert.deepEqual(buf, exp)

assert.equal(encoder.table.table.length, 3)
assert.equal(encoder.table.table[0].name, 'set-cookie')
assert.equal(encoder.table.table[0].value
    , 'foo=ASDJKHQKBZXOQWEOPIUAXQWEOIU; max-age=3600; version=1')
assert.equal(encoder.table.table[1].name, 'content-encoding')
assert.equal(encoder.table.table[1].value, 'gzip')
assert.equal(encoder.table.table[2].name, 'date')
assert.equal(encoder.table.table[2].value, 'Mon, 21 Oct 2013 20:13:22 GMT')
assert.equal(encoder.table.size, 215)

decoder.write(buf)
exp =
  [ ':status', '200', Decoder.REP_INDEXED
  , 'cache-control', 'private', Decoder.REP_INDEXED
  , 'date', 'Mon, 21 Oct 2013 20:13:22 GMT', Decoder.REP_INCREMENTAL_INDEXING
  , 'location', 'https://www.example.com', Decoder.REP_INDEXED
  , 'content-encoding', 'gzip', Decoder.REP_INCREMENTAL_INDEXING
  , 'set-cookie', 'foo=ASDJKHQKBZXOQWEOPIUAXQWEOIU; max-age=3600; version=1'
      , Decoder.REP_INCREMENTAL_INDEXING
  ]
assert.deepEqual(headers, exp)
headers.length = 0
