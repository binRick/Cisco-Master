var kue = require('kue'),
    trim = require('trim'),
    pms = require('pretty-ms'),
    clear = require('cli-clear'),
    pb = require('pretty-bytes'),
    term = require('terminal-kit').terminal,
    _ = require('underscore'),
    logSymbols = require('log-symbols'),
    c = require('chalk'),
    pj = require('prettyjson'),
    servers = require('./_servers.json'),
    conf = require('./config'),
    unique_kue = require('unique-kue'),
    Attempts = 3;


var queue = kue.createQueue({
    redis: conf.redis
});
unique_kue.setup(kue);
var config = require('./config');


queue.on('job enqueue', function(id, type) {
    console.log('Job %s got queued of type %s', id, type);

}).on('job complete', function(id, result) {
    kue.Job.get(id, function(err, job) {
        if (err) return;
        if (job.data.routerBackup && job.data.routerBackup == '1') {
            console.log(c.yellow.bold('queuing job for remote backup'), c.white(job.id, job.data.host), c.red.bold(job.result.length));
            queue.create('remoteBackup', {
                title: 'backup of job ' + job.id + ' of ' + job.result.length + ' bytes',
                server: job.data,
                config: job.result,
                configSize: job.result.length
            }).save();
        } else {
            console.log('not processing completed job #%d', job.id);
        }
    });
});



_.each(servers, function(server) {
    var Job = {
        title: 'Client router ' + server.host + ' backup type ' + server.backupMode,
        host: server.host,
        shellPrompt: server.shellPrompt,
        routerBackup: 1,
    };
    var createJob = function() {
        console.log(pj.render(Job));
        queue.create_unique_delayed(server.backupMode, Job.host, 1000, Job);
        console.log('Created Job for host ' + server.host);


    };
    createJob();
    setInterval(createJob, server.intervalSeconds * 1000);
});