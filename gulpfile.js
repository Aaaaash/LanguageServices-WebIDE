'use strict';
const gulp = require('gulp');
const decompress = require('gulp-decompress');
const download = require('gulp-download');
const cp = require('child_process');

const SERVER_HOME = 'lsp-java-server';

gulp.task('download-java-server', () => {
	download("http://download.eclipse.org/jdtls/snapshots/jdt-language-server-latest.tar.gz")
		.pipe(decompress())
		.pipe(gulp.dest(`./${SERVER_HOME}`))
});

gulp.task('install-py-server', () => {
	cp.execSync('pip install python-language-server', { stdio: [0, 1, 2], uid: 'root' });
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
	return isWin()?"mvnw.cmd":"./mvnw";
}
