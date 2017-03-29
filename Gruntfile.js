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
          'www/bower.json': 'bower.json'
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
        command: 'cd www && bower i && cd ..'
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
    'shell:install',
    'clean:tmp'
  ])

  grunt.registerTask('run', [
    'compile',
    'shell:start'
  ])
  grunt.registerTask('test', [
    // TODO
  ])

  grunt.registerTask('default', [ 'run' ])
}
