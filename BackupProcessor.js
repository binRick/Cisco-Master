var kue = require('kue'),
    Sftp = require('sftp-upload'),
    config = require('./config'),
    async = require('async'),
    c = require('chalk'),
    pty = require('pty.js'),
    trim = require('trim'),
    fs = require('fs'),
    clear = require('cli-clear'),
    _ = require('underscore'),
    telnet = require('telnet-client'),
    pj = require('prettyjson'),
    queue = kue.createQueue({
        redis: {
            port: 8100,
            host: 'beo.infinitumtech.net'
        }
    });
var Client = require('ssh2').Client;
var ScpClient = require('scp2').Client;

var successLogger = function(type, backup) {
    console.log(c.green.bgBlack.bold(type + ' Backup Processed @ ') + c.white.bold(backup.length) + c.green.bgBlack.bold(' bytes'));
};
var backupServers = require('./_backupServers.json');
queue.process('backupProcess', 1, function(job, ctx, done) {
    console.log(job.data.options);
    var client = new ScpClient(job.data.options);
    client.on('error', done);
    client.on('end', function() {
        done();
    });
    client.on('connect', function() {
        job.log('sftp connceted');
    });
    client.on('transfer', function(buffer, uploaded, total) {
        console.log('transfer ' + uploaded + '/' + total);
        job.log('transfer ' + uploaded + '/' + total);
    });
    client.write({
        destination: job.data.options.destination,
        content: job.data.job.data.config
    }, function() {
        console.log('bu completed');
    });
});
queue.process('remoteBackup', 1, function(job, ctx, done) {
    _.each(backupServers, function(buServer) {
        var options = {
            host: buServer.host,
            username: buServer.user,
            password: buServer.pass,
            path: '/home/burick/test.txt',
        };
        queue.create('backupProcess', {
            options: options,
            job: job
        }).save();
        console.log('saved job ' + job.id + ' and bu server ' + buServer.host);

    });
    done();


});