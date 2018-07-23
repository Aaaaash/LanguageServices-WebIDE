/* tslint:disable */
import * as which from 'which';
import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';
import * as WinReg from 'winreg';

const exec = childProcess.exec;
const dirname = path.dirname;
const exists = fs.existsSync;
const stat = fs.statSync;
const readlink = fs.readlinkSync;
const resolve = path.resolve;
const lstat = fs.lstatSync;

let javaHome;

const isWindows = process.platform.indexOf('win') === 0;

function _findJavaHome(options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = null;
  }
  options = options || {
    allowJre: false,
  };
  const JAVA_FILENAME = (options.allowJre ? 'java' : 'javac') + (isWindows ? '.exe' :'');
  let macUtility;
  let possibleKeyPaths;

  if (process.env.JAVA_HOME && dirIsJavaHome(process.env.JAVA_HOME, JAVA_FILENAME)) {
    javaHome = process.env.JAVA_HOME;
  }

  if (javaHome)return next(cb, null, javaHome);

  // windows
  if (process.platform.indexOf('win') === 0) {
    // java_home can be in many places
    // JDK paths
    possibleKeyPaths = [
      'SOFTWARE\\JavaSoft\\Java Development Kit',
    ];
    // JRE paths
    if (options.allowJre) {
      possibleKeyPaths = possibleKeyPaths.concat([
        'SOFTWARE\\JavaSoft\\Java Runtime Environment',
      ]);
    }

    javaHome = findInRegistry(possibleKeyPaths);
    if (javaHome)return next(cb, null, javaHome);
  }

  which(JAVA_FILENAME, function (err, proposed) {
    if (err)return next(cb, err, null);

    // resolve symlinks
    proposed = findLinkedFile(proposed);

    // get the /bin directory
    proposed = dirname(proposed);

    // on mac, java install has a utility script called java_home that does the
    // dirty work for us
    macUtility = resolve(proposed, 'java_home');
    if (exists(macUtility)) {
      exec(macUtility, { cwd:proposed }, function (error, out, err) {
        if (error || err)return next(cb, error || '' + err, null);
        javaHome = '' + out.replace(/\n$/, '');
        next(cb, null, javaHome);
      }) ;
      return;
    }

    // up one from /bin
    javaHome = dirname(proposed);

    next(cb, null, javaHome);
  });
}

function findInRegistry(paths) {
  if (!paths.length) return null;

  let keysFound = [];
  const keyPath = paths.forEach(function (element) {
    const key = new WinReg({ key: element });
    key.keys(function (err, javaKeys) {
      keysFound.concat(javaKeys);
    });
  },                            this);

  if (!keysFound.length) return null;

  keysFound = keysFound.sort(function (a, b) {
    const aVer = parseFloat(a.key);
    const bVer = parseFloat(b.key);
    return bVer - aVer;
  });
  let registryJavaHome;
  keysFound[0].get('JavaHome', function (err, home) {
    registryJavaHome = home.value;
  });

  return registryJavaHome;
}

// iterate through symbolic links until
// file is found
function findLinkedFile(file) {
  if (!lstat(file).isSymbolicLink()) return file;
  return findLinkedFile(readlink(file));
}

function next(cb, err, home) {
  process.nextTick(function () {cb(err, home); });
}

function dirIsJavaHome(dir, JAVA_FILENAME) {
  return exists('' + dir)
    && stat(dir).isDirectory()
    && exists(path.resolve(dir, 'bin', JAVA_FILENAME));
}

function after(count, cb) {
  return function () {
    if (count <= 1)return process.nextTick(cb);
    --count;
  };
}

export default function findJavaHome() {
  return new Promise((resolve, reject) => {
    _findJavaHome({}, (err, home) => {
      if (err) {
        reject('Java runtime could not be located');
      }
      resolve(home + '/bin/java');
    });
  });
}
