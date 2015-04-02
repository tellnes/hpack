# hpack

[![Build Status](https://travis-ci.org/tellnes/hpack.svg?branch=master)](https://travis-ci.org/tellnes/hpack)
[![Coverage Status](https://coveralls.io/repos/tellnes/hpack/badge.svg?branch=master)](https://coveralls.io/r/tellnes/hpack?branch=master)
[![Tips](https://img.shields.io/gratipay/tellnes.svg)](https://gratipay.com/tellnes/)

Pure JavaScript implementation of the Header Compression format for HTTP/2.

Draft: [12](https://tools.ietf.org/html/draft-ietf-httpbis-header-compression-12)

## Usage

Please see `example.js`.

## Install

```bash
npm install -S hpack
```


## hpack.Decoder.huffmanSpeed (default `3`)

This option sets the number of bits to read at once by the huffman decoder.

Each level decreases the run time linearly while increasing the static memory
usage exponentially.

Valid values are:
- `1` rss around 350 kB  (Reading bit by bit)
- `2` rss around 800 kB  (Reading two bits at once)
- `3` rss around 3,7 MB  (Reading four bits at once)
- `4` rss around 33,7 MB (Reading eight bits at once)

Changing this will only take effect for new instances of `hpack.Decoder`
created after the change.

You should only change this at startup. It will read the table synchronously
from disk.

The huffman decoding algorithm is based on
[Fast Prefix Code Processing](http://graphics.ics.uci.edu/pub/Prefix.pdf).


## Class: hpack.Decoder(options)

Decoder is a writable stream. You write incoming buffers and it will emit
`header` events.


### Options

#### `maxTableSize` (default `4096`)

Initial maximum table size. Determine the maximum size that the encoder is using for
the dynamic table.  In HTTP/2, this value is determined by the
SETTINGS_HEADER_TABLE_SIZE setting
(see [Section 6.5.2 of HTTP2](https://tools.ietf.org/html/draft-ietf-httpbis-http2-17#section-6.5.2)).

See [Section 4.2](https://tools.ietf.org/html/draft-ietf-httpbis-header-compression-12#section-4.2)
in the specification for details.


### decoder.setMaxTableSize(size)

Changes the maximum table size. See `maxTableSize` option above for details.


### decoder.write(buf)



### Event: 'header'

```js
function(name, value, representation) { }
```

- `name`: Header field name.
- `value`: Header field value.
- `representation`: How the field was represented. Usefull if you are acting as
  a intermediary.


### Decoder Representation Constants

See
[Section 6](https://tools.ietf.org/html/draft-ietf-httpbis-header-compression-12#section-6)
in the specification details.

- `Decoder.REP_INDEXED`: Indexed Header Field Representation.
- `Decoder.REP_INCREMENTAL_INDEXING`: Literal Header Field with Incremental Indexing.
- `Decoder.REP_WITHOUT_INDEXING`: Literal Header Field without Indexing.
- `Decoder.REP_NEVER_INDEXED`: Literal Header Field never Indexed.


## License

MIT
