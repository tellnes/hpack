'use strict'

const Encoder = require('../').Encoder
const Decoder = require('../').Decoder
const assert = require('assert')


const encoder = new Encoder()
const decoder = new Decoder()
const headers = []

var exp
var buf

decoder.on('header', function(name, value, rep) {
  headers.push(name, value, rep)
})

function assertTables() {
  assert.deepEqual(encoder.table, decoder.table)
}

assert.throws(function() {
  encoder.set(null)
}, TypeError)

assert.throws(function() {
  encoder.set({ })
}, TypeError)

assert.throws(function() {
  encoder.set('foo', 42)
}, TypeError)


encoder.set(':method', 'GET')
buf = encoder.read()
assert.deepEqual(buf, new Buffer([ 0x82 ]))

// Clear
decoder.write(buf)
headers.length = 0

assertTables()


encoder.set('empty', '')
buf = encoder.read()
exp = new Buffer([ 0x40, 0x84, 0x2d, 0x35, 0xa7, 0xd7, 0x80 ])
assert.deepEqual(buf, exp)

decoder.write(buf)
exp =
  [ 'empty'
  , ''
  , Decoder.REP_INCREMENTAL_INDEXING
  ]
assert.deepEqual(headers, exp)
headers.length = 0

assertTables()



encoder.set(':status', '200')
encoder.setMaxTableSize(1024)
encoder.set('accept-encoding', 'gzip, deflate')
buf = encoder.read()
exp = new Buffer([ 0x88, 0x3f, 0xe1, 0x07, 0x90 ])
assert.deepEqual(buf, exp)
decoder.write(buf)
exp =
  [ ':status'
  , '200'
  , Decoder.REP_INDEXED
  , 'accept-encoding'
  , 'gzip, deflate'
  , Decoder.REP_INDEXED
  ]
assert.deepEqual(headers, exp )
headers.length = 0

assertTables()


// Decoding error

assert.throws(function() {
  const de = new Decoder()
  // 0x80 indexed
  // 0    invalid index
  de.write(new Buffer([ 0x80 | 0 ]))
})

assert.throws(function() {
  const de = new Decoder()
  // 0x80 indexed
  // 62   first undefined index
  de.write(new Buffer([ 0x80 | 62 ]))
})

assert.throws(function() {
  const de = new Decoder()
  // 0x40 literal incremental indexing
  // 62   first undefined index
  de.write(new Buffer([ 0x40 | 62 ]))
})

assert.throws(function() {
  const de = new Decoder(10) // 10 = lower thant 14
  // 0x20 dynamic table size update
  // 14   new table size that can be encoded into the last 5 bits
  de.write(new Buffer([ 0x20 | 14 ]))
})


// setMaxTableSize

assert.throws(function() {
  const en = new Encoder()
  en.setMaxTableSize(null)
})
assert.throws(function() {
  const de = new Decoder()
  de.setMaxTableSize('foo')
})

assert.equal(encoder.table.size, 37)
assert.equal(encoder.table.table.length, 1)

encoder.setMaxTableSize(75)
encoder.set('foo', 'bar')
assert.equal(encoder.table.size, 75)
assert.equal(encoder.table.table.length, 2)

encoder.setMaxTableSize(20)
encoder.set('to-big', 'header')
assert.equal(encoder.table.size, 0)
assert.equal(encoder.table.table.length, 0)

encoder.setMaxTableSize(38)
encoder.set('foo', 'bar')
assert.equal(encoder.table.size, 38)
assert.equal(encoder.table.table.length, 1)

encoder.setMaxTableSize(80)
encoder.set('some', 'header')
assert.equal(encoder.table.size, 80)
assert.equal(encoder.table.table.length, 2)

encoder.setMaxTableSize(0)
encoder.setMaxTableSize(128)
encoder.set('foo', 'bar')
assert.equal(encoder.table.size, 38)
assert.equal(encoder.table.table.length, 1)

decoder.setMaxTableSize(1024)

decoder.write(encoder.read())
// Discard headers
headers.length = 0
assertTables()


// reuse name from dynamic table

encoder.set('foo', 'baz', { huffman: false })
buf = encoder.read()
exp = new Buffer([ 0x40 | 62 // 0x40: literal, 62: index
                 , 3 // string length
                 , 0x62 // 'b'
                 , 0x61 // 'a'
                 , 0x7a // 'z'
                 ])
assert.deepEqual(buf, exp)

decoder.write(buf)
assert.deepEqual(headers, [ 'foo', 'baz', 1 ])
headers.length = 0
assertTables()

// huffman bigger

encoder.set('foo', '!')
buf = encoder.read()
exp = new Buffer([ 0x40 | 62
                 , 1 // str length
                 , 0x21 // '!'
                 ])
assert.deepEqual(buf, exp)

decoder.write(buf)
assert.deepEqual(headers, [ 'foo', '!', 1 ])
headers.length = 0
assertTables()


// decoder write empty

decoder.write(new Buffer(0))
assertTables()


// // decoder write chunked

encoder.setMaxTableSize(0)
encoder.setMaxTableSize(1024)
encoder.set('foo', 'baz', { huffman: false })
encoder.set('bar', 'baz', { huffman: true })

buf = encoder.read()
for (var i = 0; i < buf.length; i++) {
  decoder.write(buf.slice(i, i + 1))
}

assert(headers, [ 'foo', 'baz', 1, 'bar', 'baz', 1 ])
headers.length = 0

assertTables()