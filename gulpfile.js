var     gulp        = require('gulp'),
	plumber     = require('gulp-plumber'),
	browserSync = require('browser-sync'),
	uglify      = require('gulp-uglify'),
	concat      = require('gulp-concat'),
	prefixer    = require('autoprefixer-stylus'),
	imagemin    = require('gulp-imagemin'),
	cp          = require('child_process');
	sass        = require('gulp-sass');

var messages = {
	jekyllBuild: '<span style="color: grey">Running:</span> $ jekyll build'
};


gulp.task('jekyll-build', function (done) {
	browserSync.notify(messages.jekyllBuild);
	return cp.spawn("bundle", ['exec','jekyll','build'], {stdio: 'inherit'})
		.on('close', done);
});

gulp.task('jekyll-rebuild', ['jekyll-build'], function () {
	browserSync.reload();
});

gulp.task('browser-sync', ['jekyll-build'], function() {
	browserSync({
		server: {
			baseDir: '_site'
		}
	});
});


gulp.task('sass', function(){
		gulp.src('src/sass/main.sass')
		.pipe(sass())
		.pipe(gulp.dest('_site/assets/css/'))
		.pipe(browserSync.reload({stream:true}))
    		.pipe(gulp.dest('assets/css'));
});

gulp.task('js', function(){
	return gulp.src('src/js/**/*.js')
		.pipe(concat('main.js'))
		.pipe(uglify())
		.pipe(gulp.dest('assets/js/'))
		.pipe(browserSync.reload({stream:true}))
    		.pipe(gulp.dest('_site/assets/js/'));
});

gulp.task('imagemin', function() {
	return gulp.src('src/img/**/*.{jpg,png,gif}')
		.pipe(plumber())
		.pipe(imagemin({ optimizationLevel: 3, progressive: true, interlaced: true }))
		.pipe(gulp.dest('assets/img/'));
});

gulp.task('watch', function () {
	gulp.watch('src/sass/*.sass', ['sass']);
	gulp.watch('src/img/**/*.{jpg,png,gif}', ['imagemin']);
	gulp.watch(['*.html', '_includes/*.html', '_layouts/*.html', '_posts/*', '_config.yml'], ['jekyll-rebuild']);
});

gulp.task('default', ['js', 'sass', 'browser-sync', 'watch']);
