var fs = require('fs')
var path = require('path')

var mkdirp = require('mkdirp')
var mr = require('npm-registry-mock')
var rimraf = require('rimraf')
var test = require('tap').test

var common = require('../common-tap.js')

var pkg = common.pkg

var EXEC_OPTS = { cwd: pkg, stdio: [0, 'ignore', 2] }

var json = {
  name: 'uninstall-save',
  version: '0.0.1'
}

test('setup', function (t) {
  mkdirp.sync(path.resolve(pkg, 'node_modules'))
  fs.writeFileSync(
    path.join(pkg, 'package.json'),
    JSON.stringify(json, null, 2)
  )
  mr({ port: common.port }, function (er, s) {
    t.ifError(er, 'started mock registry')
    t.parent.teardown(() => s.close())
    t.end()
  })
})

test('uninstall --save removes rm-ed package from package.json', function (t) {
  var config = [
    '--registry', common.registry,
    '--save-prefix', '^',
    '--save',
    '--loglevel=error'
  ]
  return common.npm(config.concat(['install', 'underscore@latest']), EXEC_OPTS).spread((code) => {
    t.notOk(code, 'npm install exited with code 0')

    var p = path.join(pkg, 'node_modules', 'underscore', 'package.json')
    t.ok(JSON.parse(fs.readFileSync(p)))

    var pkgJson = JSON.parse(fs.readFileSync(
      path.join(pkg, 'package.json'),
      'utf8'
    ))
    t.deepEqual(
      pkgJson.dependencies,
      { 'underscore': '^1.5.1' },
      'got expected save prefix and version of 1.5.1'
    )

    var installed = path.join(pkg, 'node_modules', 'underscore')
    rimraf.sync(installed)

    return common.npm(config.concat(['uninstall', 'underscore']), EXEC_OPTS)
  }).spread((code) => {
    var pkgJson = JSON.parse(fs.readFileSync(
      path.join(pkg, 'package.json'),
      'utf8'
    ))

    t.deepEqual(
      pkgJson.dependencies,
      { },
      'dependency removed as expected'
    )
  })
})
