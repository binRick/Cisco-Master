var tty = require('tty.js');
var shell = 'php';
var _ = require('underscore');
var scripts = ['processQueue.php', 'createQueue.php'];
var port = 8005;
_.each(scripts, function(script) {

    var shellArgs = ['-f', script];
    var termApp = tty.createServer({
        shell: shell,
        shellArgs: shellArgs,
        static: './static',
        cwd: __dirname,
        port: port,
    });
    port++;
    termApp.listen();
});