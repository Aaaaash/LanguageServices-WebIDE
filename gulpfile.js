"use strict";
const gulp = require("gulp");
const decompress = require("gulp-decompress");
const download = require("gulp-download");
const cp = require("child_process");
const glob = require('glob');

const SERVER_HOME = "lsp-java-server";

gulp.task("download-java-server", () => {
  const jdt = glob.sync('**/lsp-java-server');
  if (jdt.length === 0 || !jdt) {
    download(
      "http://download.eclipse.org/jdtls/snapshots/jdt-language-server-latest.tar.gz"
    )
      .pipe(decompress())
      .pipe(gulp.dest(`./${SERVER_HOME}`));
  } else {
    process.stdout.write('jdt-language-server is existed.\n');
  }
});

gulp.task("install-py-server", () => {
  cp.exec('pyls -h', (err, stdout, stderr) => {
    if (err) {
      cp.execSync("sudo pip install -i https://pypi.tuna.tsinghua.edu.cn/simple 'python-language-server[all]'", {
        stdio: [0, 1, 2],
      });
    }
    process.stdout.write('pyls is existed.\n');
  });
});

function isWin() {
  return /^win/.test(process.platform);
}

function isMac() {
  return /^darwin/.test(process.platform);
}

function isLinux() {
  return /^linux/.test(process.platform);
}

function mvnw() {
  return isWin() ? "mvnw.cmd" : "./mvnw";
}
