var gulp = require('gulp'),
    browserify = require('gulp-browserify'),
    babel = require('gulp-babel'),
    plumber = require('gulp-plumber');

gulp.task('browserify', function() {
  return gulp.src(['./demo/src/index.js'])
    .pipe(plumber())
    .pipe(babel())
    .pipe(browserify({
        debug : true,
        fullPaths: true
    }))
    .pipe(gulp.dest('./demo/build/'));
});

gulp.task('watch', function() {
  gulp.watch(['./demo/src/**/*.js'], ['build']);
});

gulp.task('build', [
    'browserify'
]);

gulp.task('default', [
    'build',
    'watch'
]);
