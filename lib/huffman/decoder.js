'use strict'

const path = require('path')
const fs = require('fs')

module.exports = HuffmanDecoder


const FLAG_SYMBOLS_1 = 0x1
const FLAG_SYMBOLS_2 = 0x2
const FLAG_ACCEPTED = 0x40
const FLAG_EOS = 0x80


var table
HuffmanDecoder.setBitsTable = function(bits) {
  HuffmanDecoder.bits = bits
  const filename = path.join(__dirname, 'decode-table-' + bits + '.json')
  table = JSON.parse(fs.readFileSync(filename).toString())
}

// Default value
HuffmanDecoder.setBitsTable(4)


function HuffmanDecoder() {
  switch (HuffmanDecoder.bits) {
  case 1:
    this.decode = decode1
    break
  case 2:
    this.decode = decode2
    break
  case 4:
    this.decode = decode4
    break
  case 8:
    this.decode = decode8
    break
  }

  this.bits = HuffmanDecoder.bits
  this.table = table
  this.data = []

  this.reset()
}

HuffmanDecoder.prototype.reset = function() {
  this.state = 0
  this.accept = 1
  this.eos = false
  this.data.length = 0
}

HuffmanDecoder.prototype.visit = function(id) {
  const pos = id * 4
  const node = this.table[this.state]

  // EOS
  if (node[pos + 1] & FLAG_EOS) {
    this.eos = true
    return
  }

  if (node[pos + 1] & FLAG_SYMBOLS_1) {
    this.data.push(node[pos + 2])

  } else if (node[pos + 1] & FLAG_SYMBOLS_2) {
    this.data.push(node[pos + 2])
    this.data.push(node[pos + 3])
  }

  this.state = node[pos + 0]
  this.accept = node[pos + 1] & FLAG_ACCEPTED
}

function decode1(buf, offset, end) {
  /*jshint validthis: true */
  while (offset < end) {
    this.visit(buf[offset] >> 7      )
    this.visit(buf[offset] >> 6 & 0x1)
    this.visit(buf[offset] >> 5 & 0x1)
    this.visit(buf[offset] >> 4 & 0x1)
    this.visit(buf[offset] >> 3 & 0x1)
    this.visit(buf[offset] >> 2 & 0x1)
    this.visit(buf[offset] >> 1 & 0x1)
    this.visit(buf[offset]      & 0x1)
    offset++
  }
}

function decode2(buf, offset, end) {
  /*jshint validthis: true */
  while (offset < end) {
    this.visit(buf[offset] >> 6      )
    this.visit(buf[offset] >> 4 & 0x3)
    this.visit(buf[offset] >> 2 & 0x3)
    this.visit(buf[offset]      & 0x3)
    offset++
  }
}

function decode4(buf, offset, end) {
  /*jshint validthis: true */
  while (offset < end) {
    this.visit(buf[offset] >> 4)
    this.visit(buf[offset] & 0xf)
    offset++
  }
}

function decode8(buf, offset, end) {
  /*jshint validthis: true */
  while (offset < end) {
    this.visit(buf[offset++])
  }
}
