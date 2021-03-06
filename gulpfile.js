/*!
 * gulp
 * $ npm install gulp gulp-sass gulp-cached gulp-uglify gulp-rename gulp-concat gulp-notify gulp-filter gulp-jshint gulp-rev-append gulp-cssnano gulp-imagemin browser-sync gulp-file-include gulp-autoprefixer del --save-dev
 */

// Load plugins
var gulp = require('gulp'), // 必须先引入gulp插件
    del = require('del'),  // 文件删除
    sass = require('gulp-sass'), // sass 编译
    cached = require('gulp-cached'), // 缓存当前任务中的文件，只让已修改的文件通过管道
    uglify = require('gulp-uglify'), // js 压缩
    rename = require('gulp-rename'), // 重命名
    concat = require('gulp-concat'), // 合并文件
    notify = require('gulp-notify'), // 相当于 console.log()
    filter = require('gulp-filter'), // 过滤筛选指定文件
    jshint = require('gulp-jshint'), // js 语法校验
    cssnano = require('gulp-cssnano'), // CSS 压缩
    imagemin = require('gulp-imagemin'), // 图片优化
    browserSync = require('browser-sync'), // 保存自动刷新
    fileinclude = require('gulp-file-include'), // 可以 include html 文件
    autoprefixer = require('gulp-autoprefixer'), // 添加 CSS 浏览器前缀
    htmlmin = require('gulp-htmlmin'), //压缩html
    rev = require('gulp-rev'), //生成版本号
    revReplace = require('gulp-rev-replace'); //添加版本号

// sass
gulp.task('sass', function() {
    return gulp.src('src/sass/**/*.scss')  // 传入 sass 目录及子目录下的所有 .scss 文件生成文件流通过管道
        .pipe(cached('sass'))  // 缓存传入文件，只让已修改的文件通过管道（第一次执行是全部通过，因为还没有记录缓存）
        .pipe(sass({outputStyle: 'expanded'})) // 编译 sass 并设置输出格式
        .pipe(autoprefixer('last 5 version')) // 添加 CSS 浏览器前缀，兼容最新的5个版本
        .pipe(gulp.dest('dist/css')) // 输出到 dist/css 目录下（不影响此时管道里的文件流）
        //.pipe(rename({suffix: '.min'})) // 对管道里的文件流添加 .min 的重命名
        .pipe(cssnano()) // 压缩 CSS
        .pipe(gulp.dest('dist/css')) // 输出到 dist/css 目录下，此时每个文件都有压缩（*.min.css）和未压缩(*.css)两个版本
});

// css （拷贝 *.min.css，常规 CSS 则输出压缩与未压缩两个版本）
gulp.task('css', function() {
    return gulp.src('src/css/**/*.css')
        .pipe(cached('css'))
        .pipe(gulp.dest('dist/css')) // 把管道里的所有文件输出到 dist/css 目录
        .pipe(filter(['**/*', '!*.min.css'])) // 筛选出管道中的非 *.min.css 文件
        .pipe(autoprefixer('last 5 version'))
        .pipe(gulp.dest('dist/css')) // 把处理过的 css 输出到 dist/css 目录
        //.pipe(rename({suffix: '.min'}))
        .pipe(cssnano())
        .pipe(gulp.dest('dist/css'))
});

// styleReload （结合 watch 任务，无刷新CSS注入）
gulp.task('styleReload', ['sass', 'css'], function() {
    return gulp.src(['dist/css/**/*.css'])
        .pipe(cached('style'))
        .pipe(browserSync.reload({stream: true})); // 使用无刷新 browserSync 注入 CSS
});

// script （拷贝 *.min.js，常规 js 则输出压缩与未压缩两个版本）
gulp.task('script', function() {
    return gulp.src(['src/js/**/*.js'])
        .pipe(cached('script'))
        .pipe(gulp.dest('dist/js'))
        .pipe(filter(['**/*', '!*.min.js'])) // 筛选出管道中的非 *.min.js 文件
        // .pipe(jshint('.jshintrc')) // js的校验与合并，根据需要开启
        // .pipe(jshint.reporter('default'))
        // .pipe(concat('main.js'))
        // .pipe(gulp.dest('dist/js'))
        //.pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'))
});

// image
gulp.task('image', function() {
    return gulp.src('src/img/**/*.{jpg,jpeg,png,gif}')
        .pipe(cached('image'))
        .pipe(imagemin({optimizationLevel: 3, progressive: true, interlaced: true, multipass: true}))
        // 取值范围：0-7（优化等级）,是否无损压缩jpg图片，是否隔行扫描gif进行渲染，是否多次优化svg直到完全优化
        .pipe(gulp.dest('dist/img'))
});

// html 编译 html 文件
gulp.task('html', function () {
    gulp.src('src/*.html')
        .pipe(fileinclude()) // include html
        .pipe(htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true
        }))
        .pipe(gulp.dest('dist/'));
});

gulp.task("revision", function() {
    return gulp.src(['dist/**/*'])
        .pipe(rev())
        .pipe(rev.manifest({
            transformer: {
                parse: function(){
                },
                stringify: function(version){
                    for(var i in version){
                        var fileNames = i.split(".");
                        var fileName = fileNames.splice(0,1)[0];
                        var extentsionName = fileNames.join(".");
                        if(extentsionName == 'html'){
                            delete version[i];
                            continue;
                        }
                        var hash = version[i].replace(fileName + "-", "").replace("."+extentsionName, "");
                        version[i] = i + "?v=" + hash;
                    }
                    return JSON.stringify(version);
                }
            }
        }))
        .pipe(gulp.dest('dist/'));
});

gulp.task("revreplace", ["revision"], function(){
    var manifest = gulp.src("dist/rev-manifest.json");

    return gulp.src("dist/**/*")
        .pipe(revReplace({manifest: manifest}))
        .pipe(gulp.dest('dist/'));
});

// clean 清空 dist 目录
gulp.task('clean', function() {
    return del('dist/**/*');
});

// build 需要插入资源指纹（MD5），html 最后执行
gulp.task('build', ['sass', 'css', 'script', 'image', 'html'], function () {
    gulp.start('revreplace');
});

// default 默认任务，依赖清空任务
gulp.task('default', ['clean'], function() {
    gulp.start('build');
});

// watch 开启本地服务器并监听
gulp.task('watch', function() {
    browserSync.init({
        server: {
            baseDir: 'dist' // 在 dist 目录下启动本地服务器环境，自动启动默认浏览器
        }
    });

    // 监控 SASS 文件，有变动则执行CSS注入
    gulp.watch('src/sass/**/*.scss', ['styleReload']);
    // 监控 CSS 文件，有变动则执行CSS注入
    gulp.watch('src/css/**/*.css', ['styleReload']);
    // 监控 js 文件，有变动则执行 script 任务
    gulp.watch('src/js/**/*.js', ['script']);
    // 监控图片文件，有变动则执行 image 任务
    gulp.watch('src/img/**/*', ['image']);
    // 监控 html 文件，有变动则执行 html 任务
    gulp.watch('src/**/*.html', ['html','revreplace']);
    // 监控 dist 目录下除 css 目录以外的变动（如js，图片等），则自动刷新页面
    gulp.watch(['dist/**/*', '!dist/css/**/*']).on('change', browserSync.reload);

});