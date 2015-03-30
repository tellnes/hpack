'use strict'

const fs = require('fs')
const path = require('path')
const Encoder = require('../').Encoder

const rawdir = path.join(__dirname, 'hpack-test-case', 'raw-data')
const outdir = path.join(__dirname, 'hpack-test-case', 'node-hpack')

try {
  fs.mkdirSync(outdir)
} catch (err) {
  if (err.code !== 'EEXIST')
    throw err
}

fs.readdirSync(rawdir).forEach(function(filename) {
  const rawdata = fs.readFileSync(path.join(rawdir, filename)).toString()
  const story = JSON.parse(rawdata)
  const result = {}

  result.draft = 12
  result.description = 'node/iojs hpack encoder. See ' +
                       'https://github.com/tellnes/hpack for more information.'

  const encoder = new Encoder()

  result.cases = story.cases.map(function(ca, index) {
    ca.headers.forEach(function(obj) {
      var name = Object.keys(obj)[0]
      var value = obj[name]

      var index = true
      if (name === 'referer') index = false
      else if (name === 'cookie') index = 'never'

      encoder.set(name, value, { index: index })
    })

    var ret =
      { seqno: index
      , wire: encoder.read().toString('hex')
      , headers: ca.headers
      }

    return ret
  })

  const storyfile = path.join(outdir, filename)
  const contents = JSON.stringify(result, null, '  ')

  fs.writeFileSync(storyfile, contents)
  process.stdout.write('.')
})

process.stdout.write('\n')
