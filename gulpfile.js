var gulp = require('gulp'),
    browserify = require('gulp-browserify'),
    jshint = require('gulp-jshint'),
    jshintReporter = require("jshint-stylish"),
    babel = require('gulp-babel'),
    plumber = require('gulp-plumber');

gulp.task("jshint", function() {
  return gulp.src(["./demo/src/*.js"])
    .pipe(jshint())
    .pipe(jshint.reporter(jshintReporter));
});

gulp.task('browserify', function() {
  return gulp.src(['./demo/src/index.js'])
    .pipe(plumber())
    .pipe(babel())
    .pipe(browserify({
        debug : true,
        "fullPaths": true
    }))
    .pipe(gulp.dest('./demo/build/'));
});

gulp.task('watch', function() {
  gulp.watch(['./demo/src/**/*.js'], ['build']);
});

gulp.task('build', [
    'jshint',
    'browserify'
]);

gulp.task('default', [
    'build',
    'watch'
]);
