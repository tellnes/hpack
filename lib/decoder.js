'use strict'

const inherits = require('util').inherits
const Writable = require('stream').Writable
const staticTable = require('./table').staticTable
const Table = require('./table').Table
const staticTableLength = staticTable.table.length
const HuffmanDecoder = require('./huffman/decoder')
const assert = require('assert')

module.exports = Decoder

const STATE_INTEGER = 0
const STATE_INTEGER_CONTINUE = 1
const STATE_STRING = 2
const STATE_STRING_START = 3
const STATE_STRING_READ = 4
const STATE_HUFFMAN_READ = 5
const STATE_INDEXED = 6
const STATE_LITERAL = 7
const STATE_LITERAL_NAME = 8
const STATE_LITERAL_VALUE = 9
const STATE_INDEX = 10
const STATE_TABLE_SIZE = 11

Decoder.REP_INDEXED = 0x0
Decoder.REP_INCREMENTAL_INDEXING = 0x1
Decoder.REP_WITHOUT_INDEXING = 0x2
Decoder.REP_NEVER_INDEXED = 0x3

const pow2 =
  [ 0x1
  , 0x2
  , 0x4
  , 0x8
  , 0x10
  , 0x20
  , 0x40
  , 0x80
  ]

function Decoder(maxTableSize) {
  Writable.call(this)

  this.maxTableSize = maxTableSize || 4096
  this.table = new Table(this.maxTableSize)

  this.huffde = new HuffmanDecoder()

  // State variables
  this.state = []
  this.counter = 0
  this.huffman = false
  this.integer = 0
  this.string = ''
  this.name = ''
  this.value = ''
  this.rep = 0

}
inherits(Decoder, Writable)

Decoder.prototype.setMaxTableSize = function(size) {
  if (typeof size !== 'number')
    throw new TypeError('size must be number')

  this.maxTableSize = size
}

Decoder.prototype.getTableItem = function(index) {
  if (index < staticTableLength)
    return staticTable.table[index]
  else
    return this.table.table[index - staticTableLength]
}

Decoder.prototype._write = function(buf, enc, cb) {
  if (!buf.length)
    return cb()

  const state = this.state

  // Local vars
  var offset = 0
  var intval
  var item
  var hasMore

  out: do {
    if (!state.length) {
      // counter: bits to skip
      intval = buf[offset]
      if (intval & 0x80) { // 1xxxxxxx
        state.push(STATE_INDEXED)
        this.counter = 1

      } else if (intval & 0x40) { // 01xxxxxx
        state.push(STATE_INDEX)
        state.push(STATE_LITERAL)
        this.counter = 2
        this.rep = Decoder.REP_INCREMENTAL_INDEXING

      } else if (intval & 0x20) { // 001xxxxx
        state.push(STATE_TABLE_SIZE)
        this.counter = 3

      } else if (intval & 0x10) { // 0001xxxx
        state.push(STATE_LITERAL)
        this.counter = 4
        this.rep = Decoder.REP_NEVER_INDEXED

      } else { // 0000xxxx
        state.push(STATE_LITERAL)
        this.counter = 4
        this.rep = Decoder.REP_WITHOUT_INDEXING
      }
      state.push(STATE_INTEGER)
    }

    do {
      hasMore = (buf.length > offset)

      // console.log([ 'state ' + state[ state.length - 1 ]
      //               , 'offset ' + offset + '/' + buf.length
      //               , state.join(', ')
      //               ].join(' \t')
      //            )
      // assert(offset <= buf.length, 'offset has grown to big')

      switch (state[ state.length - 1 ]) {
      case STATE_INTEGER:
        // We should always have something to read here
        // because STATE_INTEGER is only pushed in reading states.
        assert(hasMore) // if (!hasMore) break out

        // this.counter: the amout of bits to skip
        // intval: all the rest of the bits set to '1'
        intval = pow2[8 - this.counter] - 1
        this.integer = buf[offset++] & intval
        if (this.integer === intval) {
          state[ state.length - 1 ] = STATE_INTEGER_CONTINUE
          this.counter = 0
        } else {
          state.pop()
        }
        break

      case STATE_INTEGER_CONTINUE:
        if (!hasMore) break out
        intval = buf[offset++]
        this.integer += (intval & 0x7f) << this.counter
        this.counter += 7
        if (!(intval & 0x80))
          state.pop()
        break

      case STATE_STRING:
        if (!hasMore) break out

        if (buf[offset] & 0x80)
          this.huffman = true

        state[ state.length - 1 ] = STATE_STRING_START
        state.push(STATE_INTEGER)
        this.counter = 1 // bits to skip
        break

      case STATE_STRING_START:
        this.string = ''

        if (this.integer)
          if (this.huffman)
            state[ state.length - 1 ] = STATE_HUFFMAN_READ
          else
            state[ state.length - 1 ] = STATE_STRING_READ
        else // String is empty
          state.pop()
        break

      case STATE_STRING_READ:
        if (!hasMore) break out
        // intval: end offset
        // this.integer: string length missing
        intval = Math.min(buf.length, offset + this.integer)
        this.string += buf.slice(offset, intval).toString('ascii')
        this.integer -= (intval - offset)
        offset = intval

        // End of string
        if (!this.integer)
          state.pop()
        break

      case STATE_HUFFMAN_READ:
        if (!hasMore) break out
        // intval: end offset
        // this.integer: string length missing

        intval = offset + this.integer
        if (intval > buf.length) intval = buf.length

        this.huffde.decode(buf, offset, intval)
        this.integer -= (intval - offset)
        offset = intval

        // We got a full EOS bitstream
        if (this.huffde.eos)
          return cb(new Error('decoding error'))

        // End of string
        if (!this.integer) {
          if (!this.huffde.accept)
            return cb(new Error('decoding error'))

          this.string = String.fromCharCode.apply(String, this.huffde.data)
          this.huffde.reset()
          this.huffman = false
          state.pop()
        }
        break

      case STATE_INDEXED:
        state.pop()

        if (this.integer === 0)
          return cb(new Error('decoding error'))

        item = this.getTableItem(this.integer)
        if (!item)
          return cb(new Error('decoding error'))

        this.emit('header', item.name, item.value, Decoder.REP_INDEXED)
        break

      case STATE_LITERAL:
        state[ state.length - 1 ] = STATE_LITERAL_VALUE
        state.push(STATE_STRING)

        if (this.integer) {
          item = this.getTableItem(this.integer)
          if (!item)
            return cb(new Error('decoding error'))
          this.name = item.name
        } else {
          state.push(STATE_LITERAL_NAME)
          state.push(STATE_STRING)
        }
        break

      case STATE_LITERAL_NAME:
        state.pop()
        this.name = this.string
        break

      case STATE_LITERAL_VALUE:
        state.pop()
        this.value = this.string
        this.emit('header', this.name, this.value, this.rep)
        break

      case STATE_INDEX:
        state.pop()
        this.table.add(this.name, this.value)
        break

      case STATE_TABLE_SIZE:
        state.pop()

        if (this.integer > this.maxTableSize)
          return cb(new Error('decoding error'))

        this.table.setMaxSize(this.integer)
        break
      }
    } while (state.length)

  } while (hasMore)

  assert.strictEqual(buf.length, offset)

  cb()
}



Object.defineProperty(Decoder, 'huffmanSpeed'
  , { get: function() {
        return Math.log2(HuffmanDecoder.bits) + 1
      }
    , set: function(level) {
        if (level !== 1 && level !== 2 && level !== 3 && level !== 4)
          throw new TypeError('Memory level must be an integer of 1, 2, 3 or 4')

        HuffmanDecoder.setBitsTable(Math.pow(2, level - 1))
      }
    }
  )

// Default value
HuffmanDecoder.memoryLevel = 3
