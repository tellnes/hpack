
'use strict'

const path = require('path')
const fs = require('fs')

const table =
  fs.readFileSync(path.join(__dirname, 'table.txt'))
  .toString()
  .split(/\n/g)
  .map(function(line) {
    return [ line.length, parseInt(line, 2) ]
  })

exports.calcLength = function(src) {
  var bits = 0

  for (var i = 0; i < src.length; i++)
    bits += table[src[i]][0]

  return (bits + 7) / 8 | 0
}

exports.encode = function(src, length) {
  const res = new Buffer(length)
  var offset = 0
  var left = 8
  var bits
  var code

  for (var i = 0; i < src.length; i++) {
    bits = table[src[i]][0]
    code = table[src[i]][1]

    if (left === 8)
      res[offset] = 0

    // We assume that bits <= 32
    if (left > bits) {
      left -= bits
      res[offset] |= code << left
      continue
    }

    if (left === bits) {
      res[offset++] |= code
      left = 8
      continue
    }

    bits -= left
    res[offset++] |= code >> bits

    if (bits & 0x7) {
      // align code to MSB byte boundary
      code <<= 8 - (bits & 0x7)
    }

    // fast path, since most code is less than 8
    if (bits < 8) {
      res[offset] = code
      left = 8 - bits
      continue
    }

    // handle longer code path
    if (bits > 24) {
      res[offset++] = code >> 24
      bits -= 8
    }

    if (bits > 16) {
      res[offset++] = code >> 16
      bits -= 8
    }

    if (bits > 8) {
      res[offset++] = code >> 8
      bits -= 8
    }

    if (bits === 8) {
      res[offset++] = code
      left = 8
      continue
    }

    res[offset] = code
    left = 8 - bits
  }

  // 256 is special terminal symbol, pad with its prefix
  if (left < 8) {
    bits = table[256][0]
    code = table[256][1]
    res[offset] |= code >> (bits - left)
  }

  return res
}
