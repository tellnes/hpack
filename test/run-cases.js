'use strict'

const fs = require('fs')
const path = require('path')
const testStory = require('./test-story')

const defaultDirs =
  [ 'node-hpack'
  , 'go-hpack'
  , 'haskell-http2-linear'
  , 'haskell-http2-linear-huffman'
  , 'haskell-http2-naive'
  , 'haskell-http2-naive-huffman'
  , 'haskell-http2-static'
  , 'haskell-http2-static-huffman'
  , 'nghttp2'
  , 'nghttp2-16384-4096'
  , 'nghttp2-change-table-size'
  , 'node-http2-hpack'

  // draft < 9, not compatible
  // , 'hyper-hpack'
  // , 'node-http2-protocol'
  // , 'twitter-hpack'
  ]

module.exports = function(dirs) {
  if (!dirs || !dirs.length) dirs = defaultDirs

  var offset = 0
  function nextDir() {
    if (!dirs[offset]) return // finish

    const dirname = path.join(__dirname, 'hpack-test-case', dirs[offset++])

    const stories = fs.readdirSync(dirname)

    function nextStory() {
      const filename = stories.shift()
      if (!filename) {
        setTimeout(nextDir, 100)
        return
      }

      if (!/^story\_[0-9]+\.json$/.test(filename))
        return nextStory()

      const storyfile = path.join(dirname, filename)

      console.log('testing', storyfile)
      testStory(storyfile)

      setTimeout(nextStory, 100)
    }

    nextStory()
  }

  nextDir()
}

if (!module.parent) {
  module.exports(process.argv.slice(2))
}
