var tty = require('tty.js');

var port = 8002;
var script = 'processQueue.php';
var shell = 'php';
var shellArgs = ['-f', script];

var termApp = tty.createServer({
    shell: shell,
    shellArgs: shellArgs,
    static: './static',
    cwd: __dirname,
    port: port,
});
termApp.listen();