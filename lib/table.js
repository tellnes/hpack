'use strict'

exports.staticTable = new Table(Infinity)
exports.staticTableSize = 61
exports.TableItem = TableItem
exports.Table = Table

function TableItem(name, value, size) {
  this.name = name
  this.value = value
  this.size = size
}

function Table(maxSize) {
  this.table = [ ]
  this.size = 0
  this.maxSize = maxSize || 4096
}

Table.prototype.makeSpace = function(size) {
  const maxSize = this.maxSize - size
  while (this.size > maxSize && this.table.length)
    this.size -= this.table.pop().size
  return this.size <= maxSize
}

Table.prototype.setMaxSize = function(maxSize) {
  this.maxSize = maxSize
  this.makeSpace(0)
}

Table.prototype.add = function(name, value) {
  const size = Buffer.byteLength(name) + Buffer.byteLength(value) + 32

  if (this.makeSpace(size)) {
    this.table.unshift(new TableItem(name, value, size))
    this.size += size
  }
}

Table.prototype.lookup = function(name, value) {
  const match = { name: -1, value: -1 }

  for (var i = 0; i < this.table.length; i++) {
    if (this.table[i].name === name) {
      if (this.table[i].value === value) {
        match.name = i
        match.value = i
        break
      }
      if (!~match.name)
        match.name = i
    }
  }

  return match
}


function add(index, name, value) {
  exports.staticTable.table[index] = new TableItem(name, value, 0)
}

add(0, '', '')
add(1, ':authority', '')
add(2, ':method', 'GET')
add(3, ':method', 'POST')
add(4, ':path', '/')
add(5, ':path', '/index.html')
add(6, ':scheme', 'http')
add(7, ':scheme', 'https')
add(8, ':status', '200')
add(9, ':status', '204')
add(10, ':status', '206')
add(11, ':status', '304')
add(12, ':status', '400')
add(13, ':status', '404')
add(14, ':status', '500')
add(15, 'accept-charset', '')
add(16, 'accept-encoding', 'gzip, deflate')
add(17, 'accept-language', '')
add(18, 'accept-ranges', '')
add(19, 'accept', '')
add(20, 'access-control-allow-origin', '')
add(21, 'age', '')
add(22, 'allow', '')
add(23, 'authorization', '')
add(24, 'cache-control', '')
add(25, 'content-disposition', '')
add(26, 'content-encoding', '')
add(27, 'content-language', '')
add(28, 'content-length', '')
add(29, 'content-location', '')
add(30, 'content-range', '')
add(31, 'content-type', '')
add(32, 'cookie', '')
add(33, 'date', '')
add(34, 'etag', '')
add(35, 'expect', '')
add(36, 'expires', '')
add(37, 'from', '')
add(38, 'host', '')
add(39, 'if-match', '')
add(40, 'if-modified-since', '')
add(41, 'if-none-match', '')
add(42, 'if-range', '')
add(43, 'if-unmodified-since', '')
add(44, 'last-modified', '')
add(45, 'link', '')
add(46, 'location', '')
add(47, 'max-forwards', '')
add(48, 'proxy-authenticate', '')
add(49, 'proxy-authorization', '')
add(50, 'range', '')
add(51, 'referer', '')
add(52, 'refresh', '')
add(53, 'retry-after', '')
add(54, 'server', '')
add(55, 'set-cookie', '')
add(56, 'strict-transport-security', '')
add(57, 'transfer-encoding', '')
add(58, 'user-agent', '')
add(59, 'vary', '')
add(60, 'via', '')
add(61, 'www-authenticate', '')
