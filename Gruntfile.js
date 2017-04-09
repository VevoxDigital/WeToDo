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

    browserify: {
      options: {
        external: [ 'jquery' ]
      },
      app: {
        files: {
          'www/app.js': [ 'www/js/**/*.js' ]
        }
      }
    },

    clean: {
      compile: [ 'www/' ],
      tmp: [ 'tmp/', 'www/js' ]
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

    'mocha_istanbul': {
      app: {
        options: {
          root: './src/app/js/lib'
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
  grunt.loadNpmTasks('grunt-browserify')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-pug')
  grunt.loadNpmTasks('grunt-mocha-istanbul')
  grunt.loadNpmTasks('grunt-sass')
  grunt.loadNpmTasks('grunt-shell')

  grunt.registerTask('copy:app', [
    'copy:package',
    'copy:resources',
    'copy:favicon'
  ])

  grunt.registerTask('build', [
    'copy:app',
    'babel:app',
    'browserify:app',
    'pug:app',
    'sass:app'
  ])

  grunt.registerTask('compile', [
    'clean:compile',
    'build',
    'shell:install',
    'clean:tmp'
  ])
  grunt.registerTask('recompile', [
    'build',
    'clean:tmp'
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
    'mocha_istanbul:app'
  ])

  grunt.registerTask('default', [ 'run' ])
}
