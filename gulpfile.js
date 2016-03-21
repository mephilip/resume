var pkg = require('./package.json'),
    fs = require('fs'),
    gulp = require('gulp'),
    sass = require('gulp-sass'),
    cmq = require('gulp-combine-media-queries'),
    autoprefixer = require('gulp-autoprefixer'),
    cssmin = require('gulp-cssmin'),
    replace = require('gulp-replace'),
    rename = require('gulp-rename'),
    emailBuilder = require('gulp-email-builder'),
    imagemin = require('gulp-imagemin'),
    zip = require('gulp-zip'),
    cloudfiles = require('gulp-cloudfiles'),
    jsonfile = require('jsonfile'),
    cp = require('child_process'),
    mailgun = require('gulp-mailgun');
    gutil = require( 'gulp-util' );
    ftp = require('vinyl-ftp');
    iconv = require('iconv-lite');
	path = require('path');
	sourcemaps = require('gulp-sourcemaps');

// any nunjucks filters in this framework?
var addFilters = null;
try {
  addFilters = require('./framework/gulp-resources/filters.js');
}
catch (e) {}

if (fs.exists('framework/gulp-resources/link-normalizer.js'))
  var linkNormalizer = require('framework/gulp-resources/link-normalizer.js');

var RACKSPACE_CONFIG = {
  username: 'email-dev',
  apiKey: 'efb2ef22fde942bf84a2194a9ecdebc5',
  region: 'DFW',
  container: 'emails'
}
var SUBMODULE_LOCATIONS = {
  usaa: 'http://git.lowe-ce.com/scm/usaa-e/usaa-email-framework.git',
  onstar: 'http://git.lowe-ce.com/scm/ose/onstar-email-framework.git'
}

///////////////////////
// sass
///////////////////////
var sassSrc = './framework/scss/*.scss';
var watchSrc = './framework/**/*.scss';
function doSass (cb) {
  gulp.src([sassSrc, watchSrc], { base: 'framework/scss' })
  	.pipe(sourcemaps.init())
    .pipe(sass({
	    errLogToConsole: true,
	    soureMap: 'scss',
	    sourceComments: 'map'
    }).on('error', sass.logError))
    .pipe(cmq())
    .pipe(autoprefixer())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dev/css/'))
    .pipe(cssmin())
    .pipe(rename({
      extname: '.min.css'
    }))
    .pipe(gulp.dest('dev/css/'))
    .on('end', function () {
      if (cb && typeof cb === 'function')
        cb();
    });
}
gulp.task('sass',doSass);


///////////////////////
// watch
///////////////////////
function doWatch (cb) {
  gulp.watch('framework/**/*.scss',['sass']);
  if (cb && typeof cb === 'function')
    cb();
}
gulp.task('watch',doWatch);


///////////////////////
// dev
///////////////////////
function doDev (cb) {
  var done = 0;
  var incrementDone = function () {
    done++;
    if (done === 3) {
      if (cb && typeof cb === 'function') {
        cb();
      }
    }
    else if (done === 2) {
      // start the watch AFTER the build, for safety
      console.log('dev: starting watch');
      doWatch(incrementDone);
    }
  }

  console.log('dev: sass');
  doSass(function () {
    console.log('dev: sass done');
    incrementDone();
  });
}
gulp.task('dev',doDev);


///////////////////////
// init
///////////////////////
function getSubmodule (cb) {
  // get the styles and modules for the brand
  var gp = cp.spawn('git',['submodule','add',SUBMODULE_LOCATIONS[pkg.brand],'./framework']);
  gp.stdout.pipe(process.stdout);
  gp.on('close', function () {
    console.log('done add, start init');
    var gp2 = cp.spawn('git',['submodule','init']);
    gp2.stdout.pipe(process.stdout);
    gp2.on('close', function () {
      if (cb && typeof cb === 'function') {
        cb();
      }
    });
  });
}
gulp.task('submodule',getSubmodule);

function term () {
	var test = cp.spawn('cd', ['..']);
	test.stdout.on('data', function (data) {
		console.log('stdout: ' + data);
	});
	test.stderr.on('data', function (data) {
		console.log('stderr: ' + data);
	});
	test.on('close', function(code) {
		console.log('child process exited with code ' + code);
	});
}
gulp.task('term', term);

function copyImages (cb) {
  gulp.src('framework/images/*')
    .pipe(gulp.dest('dev/images/'))
    .on('end', function () {
      if (cb && typeof cb === 'function')
        cb();
    });
}
function createBaseJson (cb) {
  // create a starter json file
  gulp.src('framework/gulp-resources/template.json')
    .pipe(rename(pkg.name + '.json'))
    .pipe(gulp.dest('dev/email-data/'))
    .on('end', function () {
      if (cb && typeof cb === 'function')
        cb();
    });
}
gulp.task('createJson',createBaseJson);

function doInit (cb) {
  getSubmodule(
    function () {
      var done = 0;
      var incrementDone = function () {
        done++;
        if (done === 2) {
          doDev(cb)
        }
      }
      copyImages(
        incrementDone
      )
      createBaseJson(
        incrementDone
      )
    }
  )
}
gulp.task('init', doInit);

var re = /[\x00-\x08\x0E-\x1F]/g;
///////////////////////
// email builder
///////////////////////
function buildEmail (cb) {
  var stream = gulp.src(['./dev/*.html'])
    .pipe(emailBuilder({
      encodeSpecialChars: true,
      juice: {
        applyWidthAttributes: true
      }
    }))
    // fix bg image paths
    .pipe(replace(/url\((['"]?)\.\.\/images/g,'url($1images/'))
    // inline just the media query and hover styles
    .pipe(replace(re, ''))
    .pipe(replace(
      /<style(.|\n)+@media(.|\n)*<\/style>/ig,
      function (match) {
        var hovers = match.match(/(?:^|})\s*([^}]*:hover[^{]*{(.|\n)+?})/g);
        var mq = match.match(/@media[^{]*\{(?:(?!\}\s*\})(.|\n))*}(\s|\n)*?}/ig);
        var ff = match.match(/@font-face\s*{.+?}/ig);
        var imports = match.match(/@import.+?(;|\n)/ig);
        var outlooks = match.match(/#outlook.*?}/g);
        var str = "";
        var outlookStr = "";
        for (var i in imports)
          str += imports[i];
        for (var f in ff)
          str += ff[f];
        for (var h in hovers)
          str += hovers[h].replace(/^}?\s*/g,'');
        for (var i in mq)
          str += mq[i];
        if (outlooks.length) {
          outlookStr += '</style><!--[if mso]><style type="text/css">';
          for (var o in outlooks)
            outlookStr += outlooks[o].replace(/#outlook\s*/,'');
          outlookStr += '</style><![endif]-->';
        }
        // see if there's an extra-inline.min.css
        try {
          var extraInline = fs.readFileSync('dev/css/extra-inline.min.css');
          str = extraInline + str;
        } catch (err) {}
        // if (extraInline)
        //   str = extraInline + str;
				if (str) {
          return '<style type="text/css">' + str + '</style>\n' + outlookStr;
				}
      }
    ))
  ;

  // add tracking code to links
  if (linkNormalizer)
    stream.pipe(linkNormalizer);

  stream
    // .pipe(replace(/\s*\n(\s|\n)*/g, ''))
    .pipe(gulp.dest('./dist/'))
    .on('end', function () {
      if (cb && typeof cb === 'function')
        cb();
    });
}
gulp.task('emailBuilder',buildEmail);

///////////////////////
// cleantext
///////////////////////

var textFolder = __dirname + '/dev/text-versions/';

function checkExt(value) {
	if (path.extname(value) == '.txt') {
		return true;
	}
}

function doTxtClean (cb) {
	
	var textFolder = __dirname + '/dev/text-versions/';
	
	var re = /[\x00-\x08\x0E-\x1F]/g; //regex that matches a lot of invalid characters
		
	var txtFiles = gulp.src(textFolder + '*.txt')
	 .pipe(replace(/–/g, '-'))
	 .pipe(replace(/—/g,'-'))
	 .pipe(replace(/”/g, '"'))
	 .pipe(replace(/“/g, '"'))
	 .pipe(replace(/’/g, '\''))
	 .pipe(replace(re, ''))
	;
	txtFiles
	 .pipe(gulp.dest('./dist/'))
	 .on('end', function () {
      		console.log('txtClean end');
	  		if (cb && typeof cb === 'function')
	        	cb();
	 });
}

gulp.task('txtclean', doTxtClean);

///////////////////////
// imagemin
///////////////////////
function doImagemin (cb) {
  gulp.src('dev/images/*')
    .pipe(imagemin({
      progressive : true
    }))
    .pipe(gulp.dest('dist/images/'))
    .on('end', function () {
      console.log('imagemin end');
      if (cb && typeof cb === 'function')
        cb();
    });
}
gulp.task('imagemin',doImagemin);

///////////////////////
// compress
///////////////////////
function doCompress (cb) {
  gulp.src('dist/images/*')
    .pipe(zip('images.zip'))
    .pipe(gulp.dest('dist'))
    .on('end', function () {
      gulp.src(['./dist/**/*'])
        .pipe(zip(pkg.name + '.zip'))
        .pipe(gulp.dest('./'))
        .on('end', function () {
          console.log('end compress');
          if (cb && typeof cb === 'function')
            cb();
        });
    });
}
gulp.task('compress',doCompress);

///////////////////////
// dist
///////////////////////
function doDist (cb) {
  var done = 0;
  var incrementDone = function () {
    done++;
    if (done === 4) {
      if (cb && typeof cb === 'function') {
        cb();
      }
    }
    else if (done === 3) {
      // start the compress AFTER the build, for safety
      console.log('dist: start compress');
      doCompress(incrementDone);
    }
  }

  buildEmail(function () {
    incrementDone();
  });

  doImagemin(function () {
    incrementDone();
  });
   
  doTxtClean (function (){
	incrementDone();
  })
}

gulp.task('dist',['sass'],doDist);


//////////////////////////
// prep litmus
//////////////////////////
function prepLitmus (cb) {
  gulp.src('dist/*.html')
    .pipe(replace(/(src=["']?|url\(["']?|background=["']?)images/g, "$1http://5eb1119f6b993ed5f255-2da6abaa1a8adb4188cb7af2a9c7f112.r70.cf1.rackcdn.com/" + pkg.name))
    .pipe(gulp.dest('litmus/'))
    .on('end',function () {
      if (cb && typeof cb === 'function')
        cb();
    });
}
gulp.task('prepLitmus',prepLitmus);


//////////////////////////
// cloud files
//////////////////////////
function doCloudfiles (cb) {
  gulp.src('dist/images/*')
    .pipe(cloudfiles(RACKSPACE_CONFIG,{
      uploadPath: pkg.name +'/'
    }))
    .on('end',function () {
      if (cb && typeof cb === 'function')
        cb();
    });
}
gulp.task('cloudfiles',doCloudfiles);


//////////////////////////
// litmus
//////////////////////////
function doLitmus (cb) {
  gulp.src('litmus/*.html')
    .pipe(emailBuilder({
      litmus: {
        username: 'rob.lyons@lowe-ce.com',
        password: 'Password123',
        url: 'https://lowece.litmus.com',
        applications: ['androidgmailapp', 'ipad', 'yahoo', 'chromeyahoo', 'ffyahoo', 'gmailnew', 'ffgmailnew', 'chromegmailnew', 'ol2010', 'ol2013', 'ol2015', 'outlookcom', 'iphone5s', 'iphone6']
      }
    }))
    .on('end', function () {
      if (cb && typeof cb === 'function')
        cb();
    });
}
gulp.task('litmus',['prepLitmus'],doLitmus);

gulp.task('test',['prepLitmus','cloudfiles','litmus']);

///////////////////////
// deploy to FTP
///////////////////////
function doDeploy (cb) {
	var conn = ftp.create( {
		host: '72.3.199.128',
		user: 'prudy',
		port: 21,
		password: 'today2728',
		parallel: 10,
		log: gutil.log
	});
	
	var globs = [
		'dist/**'
	];
	
	gulp.src( globs, { base: './dist', buffer: false} )
	.pipe( conn.newer( '/import/sites/DEV-ce_email_testing/usaa/' + pkg.date + '/' + pkg.name ) )
	.pipe( conn.dest( '/import/sites/DEV-ce_email_testing/usaa/' + pkg.date + '/' + pkg.name ) )
	.on('end', function () {
		console.log('All Files have been uploaded.');
		if (cb && typeof cb === 'function')
			cb();
	});
	
}

gulp.task('deploy', doDeploy)


//////////////////////////
// send
//////////////////////////
var recipientLists = {
  'qa' : [
    'qa@lowe-ce.com',
    'ceqateam@gmail.com',
    'cetester@hotmail.com',
    'cetester@yahoo.com',
    'ec9e17aa7d@emailtests.com'
  ],
  'glenn' : [
    'glenn.martin@c-e.com',
    'jhereg00@gmail.com'
  ],
  'philip' : [
    'philip.rudy@outlook.com',
    'philip.rudy@lowe-ce.com',
    'philiparudy@gmail.com'
  ],
  'sylvia' : [
    'sylvia.neely@c-e.com',
    'smneely1@gmail.com'
  ],
  'jz' : [
    'john.zotter@c-e.com',
    'jzotter@gmail.com'
  ]
}
var sendEmail = function () {
  // get all emails to send
  var dir = 'litmus/'
  var files = fs.readdirSync(dir);
  var recipients = [];

  function writeInstructions () {
    console.error('!! you must include one or more flags in the format `--email@address.com` or `--predefinedListName`.');
    console.error('!! example: `gulp send --qa`');
    console.error('!! currently defined lists:');
    for (var lname in recipientLists) {
      console.error('!!   ' + lname);
    }
    console.error('');
  }
  if (process.argv.length > 3) {
    // pass email addresses or predefined list name
    var args = process.argv.splice(3, process.argv.length);
    console.log('\n');
    for (var a in args) {
      var arg = args[a].replace(/^-+/,'');
      if (arg.indexOf('@') != -1) {
        recipients.push(arg);
      }
      else if (recipientLists[arg]) {
        for (var email in recipientLists[arg]) {
          recipients.push(recipientLists[arg][email]);
        }
      }
      else {
        console.error('!! invalid argument `' + arg + '` passed to `send` task.');
        writeInstructions();
      }
    }

    console.log('Send to: \n  ' + recipients.join('\n  '));
  }
  else {
    console.error('!! you must pass an argument in the form of a flag to `gulp send`');
    writeInstructions();
  }

  if (!recipients.length) {
    return;
  }

  console.log('Send:');
  for (var f in files) {
    if (/\.html$/.test(files[f])) {
      // is an html file
      console.log('  ' + files[f]);
      gulp.src(dir + files[f])
        .pipe(mailgun({
          key: 'key-d1ae2bfac528b4aa9221c7a0a5ccff71',
          sender: 'digitalstudio@c-e.com',
          recipient: recipients.join(', '),
          subject: 'EMAIL TEST -- ' + (pkg.subject || 'subject undefined')
        }));
    }
  }

  console.log('\n');
}
gulp.task('send',['prepLitmus'],sendEmail);