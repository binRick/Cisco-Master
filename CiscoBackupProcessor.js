var kue = require('kue'),
    config = require('./config'),
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
var ASYNC_CHECK_INTERVAL = 5000;
var SKIP_SYNC = false;
var express = require('express');
var ui = require('kue-ui');
var app = express();

var successLogger = function(type, backup) {
    console.log(c.green.bgBlack.bold(type + ' Backup Processed @ ') + c.white.bold(backup.length) + c.green.bgBlack.bold(' bytes'));
};
ui.setup({
    apiURL: '/api',
    baseURL: '/kue',
    updateInterval: 1000
});

app.use('/api', kue.app);
app.use('/kue', ui.app);
var lconf = __dirname + '/_servers.json';
var lconf2 = __dirname + '/_backupServers.json';
app.get('/_api/newBackupHost/:name/:host/:port/:user/:pass', function(req, res) {
    try {
        var dat = JSON.parse(fs.readFileSync(lconf2).toString()) || {};
        dat[req.params.name] = {
            name: req.params.name,
            host: req.params.host,
            port: req.params.port,
            path: req.params.path,
            user: req.params.user,
            pass: req.params.pass,
        };
        fs.writeFileSync(lconf2, JSON.stringify(dat));
        res.end('ok');
    } catch (e) {
        res.status(500).end(e);
    }
});
app.get('/_api/new/:name/:host/:dev/:shellPrompt/:intervalSeconds/:backupMode', function(req, res) {
    try {
        var dat = JSON.parse(fs.readFileSync(lconf).toString()) || {};
        dat[req.params.name] = {
            host: req.params.host,
            name: req.params.name,
            shellPrompt: req.params.shellPrompt,
            dev: req.params.dev,
            intervalSeconds: req.params.intervalSeconds,
            backupMode: req.params.backupMode,
        };
        fs.writeFileSync(lconf, JSON.stringify(dat));
        res.end('ok');
    } catch (e) {
        res.status(500).end(e);
    }
});

app.listen(config.ports.app);
queue.process('sshBackup', 3, function(job, ctx, done) {
    console.log(c.green.bgWhite.bold("Processing SSH Backup Job"), c.white.bgBlack.bold(job.id));
    var backup = '';
    var conn = new Client();
    conn.on('error', function(error) {});
    conn.on('ready', function() {
        conn.shell(function(err, stream) {
            if (err) return done(err);
            stream.on('close', function() {
                conn.end();
                var l = 'host ' + job.data.host + ' backup retrieved ' + backup.length + ' bytes';
                successLogger('SSH Backup Host ' + job.data.host, backup);
                ///               console.log(c.green.bgBlack.bold('Processed config of ') + c.white.bold(backup.length + ' bytes'));
                job.log(backup.replace(/\n/g, '<br>'));
                if (backup.length > 100)
                    done(null, backup);
                else
                    done(backup);
            }).on('data', function(data) {
                backup = backup + data;
            }).stderr.on('data', function(data) {});
            stream.end('term len 0\nsh run\nexit\n');
        });
    }).connect({
        host: job.data.host,
        port: 22,
        username: config.telnet.user,
        password: config.telnet.pass,
    });
});


queue.process('asa5520Backup', 3, function(job, ctx, done) {
    console.log(c.green.bgWhite.bold("Processing ASA 5520 Job"), c.white.bgBlack.bold(job.id));
    console.log(pj.render(job.data));
    var term = pty.spawn('bash', [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME,
        env: process.env
    });

    var connectCmd = 'ssh ' + config.telnet.user + '@' + job.data.host;
    var backup = '';
    var dB = false;
    var maxRun = 10000;

    setTimeout(function() {
        term.kill();
        done('time out');
    }, maxRun);



    term.on('data', function(data) {
        var aData = data.split('\n').filter(function(s) {
            return s;
        });
        _.each(aData, function(data) {
            if (dB)
                backup = backup + data + '\n';
            data = trim(data);
            if (data == config.telnet.user + "@" + job.data.host + "'s password:") {
                term.write(config.telnet.pass + '\r');
            } else if (data == 'Password:') {
                term.write(config.telnet.pass + '\r');
            } else if (data == job.data.shellPrompt + '>') {
                term.write('en\r');
            } else if (data == job.data.shellPrompt + '#') {
                if (dB && backup.length > 100) {
                    successLogger('asa5520 Backup Host ' + job.data.host, backup);
                    //               console.log(c.green.bgBlack.bold('asa5520 backup Processed config of ') + c.white.bold(backup.length + ' bytes'));
                    done(null, backup);
                    return term.kill();

                }
                setTimeout(function() {
                    dB = true;
                    term.write('term pager 0\rsh run\r');
                }, 500);
            }
            //  }else
            //	console.log('out not matched: "'+data.length+'"');

        });
    });




    term.write(connectCmd + '\r');


});


var cmd = 'sh run';
queue.process('telnetBackup', 3, function(job, ctx, done) {
    console.log(c.green.bgWhite.bold("Processing Telnet Job"), c.white.bgBlack.bold(job.id));
    try {
        //clear();
        console.log(pj.render(job.data));
        job.progress(10, 100);
        var Telnet_params = {
            host: job.data.host,
            port: 23,
            loginPrompt: 'Username: ',
            passwordPrompt: 'Password: ',
            username: config.telnet.user,
            password: config.telnet.pass,
            shellPrompt: job.data.shellPrompt + '#',
            pageSeparator: '--More-- ',
            timeout: 1500,
        };
        var connection = new telnet();
        connection.on('ready', function(prompt) {
            job.progress(30, 100);
            var backup = '';
            connection.exec(cmd, function(response) {
                backup = response;
                job.data.backupSize = backup.length;
                job.progress(80, 100);
                job.log(backup.replace(/\n/g, '<br>'));
            });
            connection.on('timeout', function() {
                connection.end();
                job.progress(90, 100);
            });
            connection.on('close', function() {
                job.progress(100, 100);
                successLogger('Telnet Backup', backup);

                if (backup.length > 10)
                    done(null, backup);
                else
                    done();
            });
        });
        connection.on('error', done);
        connection.connect(Telnet_params);
    } catch (e) {
        done(e);
    }
});
kue.app.listen(config.ports.kue);
kue.app.set('title', 'cisco backup app');