'use strict'

const Decoder = require('../').Decoder

const assert = require('assert')
const fs = require('fs')

module.exports = testStory

function testStory(filename) {
  const story = JSON.parse(fs.readFileSync(filename).toString())
  if (story.draft < 9) throw new Error('draft not compatible')

  test(story, function(decoder, wire) {
    decoder.write(wire)
  })

  test(story, function(decoder, wire) {
    var offset = 0
    while (offset < wire.length) {
      decoder.write(wire.slice(offset, ++offset))
    }
  })

  test(story, function(decoder, wire) {
    var offset = 0
    var start = 0
    while (offset < wire.length) {
      if (Math.random() > 0.8) {
        decoder.write(wire.slice(start, offset))
        start = offset
      }
      offset++
    }
    if (start < offset)
      decoder.write(wire.slice(start, offset))
  })

}

function test(story, write) {
  const decoder = new Decoder()

  var headers = []
  decoder.on('header', function(name, value/*, rep */) {
    var obj = {}
    obj[name] = value
    headers.push(obj)
  })

  story['cases'].forEach(function(cas) {
    if (cas['header_table_size'])
      decoder.setMaxTableSize(cas['header_table_size'])

    write(decoder, new Buffer(cas['wire'], 'hex'))

    // console.log('------')
    // console.log(headers)
    // console.log(cas.headers)
    assert.deepEqual(headers, cas.headers)
    headers.length = 0
  })
}

if (!module.parent) {
  testStory(process.argv[2])
}
