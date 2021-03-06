var SSH = require('ssh2'),
    fs = require('fs'),
    path = require('path'),
    async = require('async');

var Connection = function(callback) {
        this.conn = new SSH();

        var me = this;
        this.conn.on('connect', function() {
            console.log('Connection :: connect');
        });

        this.conn.on('ready', function() {
            console.log('Connection :: ready');

            me.conn.sftp(function(err, sftp) {
                if (err) throw err;

                callback && callback(sftp);
            });
        });

        this.conn.on('error', function(err) {
            console.log('Connection :: error :: ' + err);
        });
        this.conn.on('end', function() {
            console.log('Connection :: end');
        });
        this.conn.on('close', function(had_error) {
            console.log('Connection :: close');
        });
    };

module.exports = Connection;

Connection.prototype.connect = function(config) {
    this.conn.on('keyboard-interactive', function(name, instructions, instructionsLang, prompts, finish) {
        finish([config.password]);
    });

    this.conn.connect(config);
};

Connection.prototype.close = function() {
    this.conn.end();
};