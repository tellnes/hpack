'use strict'

const inherits = require('util').inherits
const Readable = require('stream').Readable
const staticTable = require('./table').staticTable
const Table = require('./table').Table
const huffman = require('./huffman')

module.exports = Encoder

function Encoder(maxTableSize) {
  Readable.call(this)

  this.smallestMaxTableSize = Infinity
  this.newMaxTableSize = null
  this.table = new Table(maxTableSize)
}
inherits(Encoder, Readable)

Encoder.prototype._read = function() {
  // noop
}

Encoder.prototype.setMaxTableSize = function(size) {
  if (typeof size !== 'number')
    throw new TypeError('size must be number')

  if (size < this.smallestMaxTableSize)
    this.smallestMaxTableSize = size

  this.newMaxTableSize = size
}

Encoder.prototype.set = function(name, value, options) {
  if (typeof name !== 'string')
    throw new TypeError('header name field must be string')
  if (typeof value !== 'string')
    throw new TypeError('header value field must be string')

  options = options || {}
  const useHuffman = options.huffman !== false

  if (this.newMaxTableSize !== null) {
    if (this.smallestMaxTableSize < this.newMaxTableSize) {
      this.number(this.smallestMaxTableSize, 5, true)
      this.table.setMaxSize(this.smallestMaxTableSize)
    }

    this.number(this.newMaxTableSize, 5, true)
    this.table.setMaxSize(this.newMaxTableSize)

    this.smallestMaxTableSize = Infinity
    this.newMaxTableSize = null
  }

  const match = staticTable.lookup(name, value)
  var prefix
  var set

  if (!~match.value) {
    const matchDynamic = this.table.lookup(name, value)
    if (~matchDynamic.value)
      match.value = matchDynamic.value + 62
    else if (!~match.name && ~matchDynamic.name)
      match.name = matchDynamic.name + 62
  }

  switch (options.index) {
  default:
  case true:
    if (~match.value) {
      this.number(match.value, 7, true)
      return
    }

    this.table.add(name, value)

    prefix = 6
    set = true
    break

  case false:
    prefix = 4
    set = false
    break

  case 'never':
    prefix = 4
    set = true
    break
  }

  if (~match.name) {
    this.number(match.name, prefix, set)
    this.string(value, useHuffman)
  } else {
    this.number(0, prefix, set)
    this.string(name, useHuffman)
    this.string(value, useHuffman)
  }
}

Encoder.prototype.number = function(value, pos, set) {
  const limit = Math.pow(2, pos) - 1
  const buf = []
  var offset = 0

  if (value >= limit) {
    buf[offset++] = limit
    value = value - limit
    while (value >= 0x80) {
      buf[offset++] = value % 0x80 | 0x80
      value = value / 0x80 | 0
    }
  }
  buf[offset++] = value

  if (set) buf[0] |= (limit + 1)

  this.push(new Buffer(buf))
}

Encoder.prototype.string = function(str, useHuffman) {
  const buf = new Buffer(str)
  const huf = useHuffman ? huffmanEncode(buf) : null
  const res = huf || buf
  this.number(res.length, 7, huf ? true : false)
  this.push(res)
}

function huffmanEncode(buf) {
  const result = new Buffer(buf.length)

  var resultOffset = 0
  var bits = ''
  var offset = 0

  while (offset < buf.length) {
    bits += huffman.table[buf[offset++]]
    while (bits.length >= 8) {
      result[resultOffset++] = parseInt(bits.substr(0, 8), 2)

      // If the huffman encoded data gets bigger than the orginal data, bail
      if (resultOffset === result.length)
        return null

      bits = bits.substr(8)
    }
  }

  if (bits.length) {
    while (bits.length < 8)
      bits += '1'
    result[resultOffset++] = parseInt(bits.substr(0, 8), 2)
  }

  return result.slice(0, resultOffset)
}
