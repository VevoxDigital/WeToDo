'use strict'

const app = require('./package.json')

const BUILD_BANNER = `/*!
 * ${app.productName} v${app.version} (${new Date().toUTCString()})
 * ${app.description}
 *
 * ${app.homepage}
 *
 * @author  ${app.author.name}
 * @license ${app.license}
 */`

exports = module.exports = grunt => {
  grunt.initConfig({
    app: app,

    babel: {
      options: {
        presets: [ 'es2015' ]
      },
      app: {
        files: {
          'tmp/app-babel.js': 'tmp/app.js'
        }
      }
    },

    browserify: {
      options: {
        external: [ 'jquery' ]
      },
      build: {
        files: {
          'tmp/app.js': [ 'src/app/js/**/*.js' ]
        }
      },
      compile: {
        files: {
          'www/app.js': [ 'src/app/js/**/*.js' ]
        }
      }
    },

    clean: {
      app: [ 'www/' ],
      tmp: [ 'tmp/' ]
    },

    copy: {
      package: {
        files: {
          'www/package.json': 'package.json'
        }
      },
      resources: {
        files: [
          { expand: true, cwd: 'src', src: [ 'resources/**' ], dest: 'www' }
        ]
      },
      favicon: {
        files: {
          'www/favicon.ico': 'src/app/favicon.ico'
        }
      }
    },

    pug: {
      options: {
        data: { app: app }
      },
      app: {
        files: [
          { expand: true, cwd: 'src/app/view', src: [ '*.pug' ], dest: 'www', ext: '.html' }
        ]
      }
    },

    uglify: {
      app: {
        options: {
          mangle: {
            reserved: ['cordova', '$']
          },
          banner: BUILD_BANNER
        },
        files: {
          'www/app.js': [ 'tmp/app-babel.js' ]
        }
      }
    },

    'mocha_istanbul': {
      app: {
        options: {
          root: './src/app/js/lib',
          istanbulOptions: [ '-x', 'data.js', '-x', 'ui/**' ]
        },
        src: [ 'test/**/*.js' ]
      }
    },

    sass: {
      options: {
        outputStyle: 'compressed'
      },
      app: {
        files: [
          { expand: true, cwd: 'src/app', src: [ 'style/*.scss' ], dest: 'www', ext: '.css' }
        ]
      }
    },

    cordovacli: {
      options: {
        cli: 'cordova'
      },
      debug: {
        command: 'run',
        platforms: 'browser'
      }
    },

    shell: {
      install: {
        command: 'cd www && npm i --production && cd ..'
      },
      start: {
        command: 'cd www && npm start && cd ..'
      }
    }
  })

  grunt.loadNpmTasks('grunt-babel')
  grunt.loadNpmTasks('grunt-browserify')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-pug')
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-mocha-istanbul')
  grunt.loadNpmTasks('grunt-sass')
  grunt.loadNpmTasks('grunt-shell')

  grunt.registerTask('copy:app', [
    'copy:package',
    'copy:resources',
    'copy:favicon'
  ])

  // build for a full package
  grunt.registerTask('build', [
    'clean:app',
    'copy:app',
    'browserify:build',
    'babel:app',
    'pug:app',
    'uglify:app',
    'sass:app',
    'clean:tmp',
    'shell:install'
  ])

  // just compile for debugging
  grunt.registerTask('compile', [
    'copy:app',
    'browserify:compile',
    'pug:app',
    'sass:app',
    'clean:tmp'
  ])
  grunt.registerTask('recompile', [
    'compile',
    'shell:install'
  ])

  grunt.registerTask('run', [
    'compile',
    'shell:start'
  ])
  grunt.registerTask('rerun', [
    'recompile',
    'shell:start'
  ])

  grunt.registerTask('test', [
    'compile', // we're running the compile task because we're also testing its functionality
    'retest'
  ])
  grunt.registerTask('retest', [
    'mocha_istanbul:app'
  ])

  grunt.registerTask('default', [ 'run' ])
}
