'use strict'

const app = require('./package.json')

exports = module.exports = grunt => {
  grunt.initConfig({
    app: grunt.file.readJSON('package.json'),

    babel: {
      options: {
        presets: [ 'es2015' ]
      },
      app: {
        files: [
          { expand: true, cwd: 'src/app', src: [ 'js/**/*.js' ], dest: 'www' }
        ]
      }
    },

    clean: {
      compile: [ 'www/' ],
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

    mochaTest: {
      app: {
        options: {
          // TODO Istanbul reporter?
        },
        src: [ 'test/**/*.js' ]
        // dest: 'coverage/coverage.lcov'
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
        playforms: 'browser'
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
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-pug')
  grunt.loadNpmTasks('grunt-mocha-test')
  grunt.loadNpmTasks('grunt-sass')
  grunt.loadNpmTasks('grunt-shell')

  grunt.registerTask('copy:app', [
    'copy:package',
    'copy:resources',
    'copy:favicon'
  ])

  grunt.registerTask('compile', [
    'clean:compile',
    'copy:app',
    'babel:app',
    'pug:app',
    'sass:app',
    'shell:install',
    'clean:tmp'
  ])

  grunt.registerTask('run', [
    'compile',
    'shell:start'
  ])
  grunt.registerTask('test', [
    'compile',
    'mochaTest:app'
  ])

  grunt.registerTask('default', [ 'run' ])
}
