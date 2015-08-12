// ---------------------------------------------------------------------
// Notes:
// If fails to run default build task then clean out the node_modules..
// remove node_modules $ rm -rf node_modules/
// run $ npm cache clean
// npm install --save-dev
// npm update --save-dev
// This at least will resolve the recursive dependency resolution.
//
// References:
// https://scotch.io/tutorials/a-quick-guide-to-using-livereload-with-gulp
//
// npm install --global gulp
// npm install
// npm install --save-dev gulp
// npm install --save-dev gulp-util
// npm install --save-dev gulp-bower
// bower install bootstrap
// bower install --save fontawesome
// bower install --save less
// bower install --save normalize.css
// bower install --save modernizr
// ---------------------------------------------------------------------

var fs = require('fs');
var path = require('path');

var gulp = require('gulp');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var notify = require('gulp-notify');
var cache = require('gulp-cache');
var livereload = require('gulp-livereload');

// Load all gulp plugins automatically
// and attach them to the `plugins` object
var plugins = require('gulp-load-plugins')();

// Temporary solution until gulp 4
// https://github.com/gulpjs/gulp/issues/355
var runSequence = require('run-sequence');

var pkg = require('./package.json');
var dirs = pkg['h5bp-configs'].directories;

// ---------------------------------------------------------------------
// | Helper tasks                                                      |
// ---------------------------------------------------------------------

gulp.task('archive:create_archive_dir', function () {
    fs.mkdirSync(path.resolve(dirs.archive), '0755');
});

gulp.task('archive:zip', function (done) {

    var archiveName = path.resolve(dirs.archive, pkg.name + '_v' + pkg.version + '.zip');
    var archiver = require('archiver')('zip');
    var files = require('glob').sync('**/*.*', {
        'cwd': dirs.dist,
        'dot': true // include hidden files
    });
    var output = fs.createWriteStream(archiveName);

    archiver.on('error', function (error) {
        done();
        throw error;
    });

    output.on('close', done);

    files.forEach(function (file) {

        var filePath = path.resolve(dirs.dist, file);

        // `archiver.bulk` does not maintain the file
        // permissions, so we need to add files individually
        archiver.append(fs.createReadStream(filePath), {
            'name': file,
            'mode': fs.statSync(filePath)
        });

    });

    archiver.pipe(output);
    archiver.finalize();

});

gulp.task('clean', function (done) {
    require('del')([
        dirs.archive,
        dirs.dist
    ], done);
});

gulp.task('copy', [
    'copy:.htaccess',
    'copy:main.css',
    'copy:misc',
]);

gulp.task('copy:.htaccess', function () {
    return gulp.src('node_modules/apache-server-configs/dist/.htaccess')
               .pipe(plugins.replace(/# ErrorDocument/g, 'ErrorDocument'))
               .pipe(gulp.dest(dirs.dist));
});

gulp.task('copy:main.css', function () {

    var banner = '/*! HTML5 Boilerplate v' + pkg.version +
                    ' | ' + pkg.license.type + ' License' +
                    ' | ' + pkg.homepage + ' */\n\n';

    return gulp.src(dirs.src + '/css/main.css')
               .pipe(plugins.header(banner))
               .pipe(plugins.autoprefixer({
                   browsers: ['last 2 versions', 'ie >= 8', '> 1%'],
                   cascade: false
               }))
               .pipe(gulp.dest(dirs.dist + '/css'));
});

gulp.task('copy:misc', function () {
    return gulp.src([

        // Copy all files
        dirs.src + '/**/*',

        // Exclude the following files
        // (other tasks will handle the copying of these files)
        //'!' + dirs.src + '/css/main.css',
        //'!' + dirs.src + '/index.html'

    ], {

        // Include hidden files by default
        dot: true

    }).pipe(gulp.dest(dirs.dist));
});


gulp.task('lint:js', function () {
    return gulp.src([
        'gulpfile.js',
        dirs.src + '/js/*.js',
        dirs.test + '/*.js'
    ]).pipe(plugins.jscs())
      .pipe(plugins.jshint())
      .pipe(plugins.jshint.reporter('jshint-stylish'))
      .pipe(plugins.jshint.reporter('fail'));
});



// ---------------------------------------------------------------------
// | Development tasks                                                  |
// ---------------------------------------------------------------------
// Paths variables

var paths = {
    /* Source paths */
    less: [
        'bower_components/bootstrap/less/bootstrap.less',
        'bower_components/fontawesome/less/font-awesome.less'
    ],
    styles: [
        'src/css/*.css',
        'bower_components/normalize.css/normalize.css'
    ],
    scripts: [
        'src/js/*.js'
    ],
    libs: [
        'bower_components/jquery/dist/jquery.js',
        'bower_components/bootstrap/dist/js/bootstrap.js',
        'bower_components/modernizr/modernizr.js'
    ],
    images: ['src/img/**/*'],
    fonts: [
        'bower_components/bootstrap/fonts/*',
        'bower_components/fontawesome/fonts/*'
    ]
};


/* Tasks */
gulp.task('styles', function() {
    return gulp.src(paths.styles)
        .pipe(gulp.dest(dirs.dist + '/css'))
        .pipe(rename({suffix: '.min'}))
        .pipe(plugins.cssmin())
        .pipe(gulp.dest(dirs.dist + '/css'))
        .pipe(notify({ message: 'Styles task complete' }));
});

// Less to CSS: Run manually with: "gulp build-css"
gulp.task('less', function() {
    return gulp.src(paths.less)
        .pipe(plugins.plumber())
        .pipe(plugins.less())
        .on('error', function (err) {
            gutil.log(err);
            this.emit('end');
        })
        .pipe(plugins.autoprefixer(
            {
                browsers: [
                    '> 1%',
                    'last 2 versions',
                    'firefox >= 4',
                    'safari 7',
                    'safari 8',
                    'IE 8',
                    'IE 9',
                    'IE 10',
                    'IE 11'
                ],
                cascade: false
            }
        ))
        .pipe(rename({suffix: '.min'}))
        .pipe(plugins.cssmin())
        .pipe(gulp.dest(dirs.dist + '/css')).on('error', gutil.log)
        .pipe(notify({ message: 'Less task complete' }));
});

// Minify Custom JS: Run manually with: "gulp scripts"
gulp.task('libs', function() {
    return gulp.src(paths.libs)
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('default'))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(gulp.dest(dirs.dist + '/js/vendor'))
        .pipe(notify({ message: 'Libs task complete' }));
});

// Minify Custom JS: Run manually with: "gulp scripts"
gulp.task('scripts', function() {
    return gulp.src(paths.scripts)
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('default'))
        .pipe(concat('main.js'))
        .pipe(gulp.dest(dirs.dist + '/js'))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(gulp.dest(dirs.dist + '/js'))
        .pipe(notify({ message: 'Scripts task complete' }));
});

gulp.task('images', function() {
    return gulp.src(paths.images)
        .pipe(cache(imagemin({ optimizationLevel: 5, progressive: true, interlaced: true })))
        .pipe(gulp.dest(dirs.dist + '/img'))
        .pipe(notify({ message: 'Images task complete' }));
});

gulp.task('fonts', function() {
    return gulp.src(paths.fonts)
        .pipe(gulp.dest(dirs.dist + '/fonts'))
        .pipe(notify({ message: 'Fonts task complete', onLast: true }));
});




// ---------------------------------------------------------------------
// | Main tasks                                                        |
// ---------------------------------------------------------------------

gulp.task('archive', function (done) {
    runSequence(
        'build',
        'archive:create_archive_dir',
        'archive:zip',
    done);
});

gulp.task('build', function (done) {
    runSequence(
        //['clean', 'lint:js'],
        ['clean', 'less'],
        'copy',
    done);
});

gulp.task('watch', function() {
    gulp.watch('src/js/*.js', ['scripts']);
    gulp.watch('src/less/**/*.less', ['less']);

    gulp.watch('src/**/*.html', ['copy:misc']);

    // Create LiveReload server
    livereload.listen();

    // Watch any files in dist/, reload on change
    gulp.watch([dirs.dist + '/!**']).on('change', livereload.changed);
});

gulp.task('default', ['build'], function() {
    gulp.start('styles', 'libs', 'scripts', 'images', 'fonts');
});
