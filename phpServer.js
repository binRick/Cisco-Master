var tty = require('tty.js'),
    child = require('child_process');
var shell = 'php';
var _ = require('underscore');
var config = require('./config');
var noide = require('noide'),
    c = require('chalk');


process.env['PORT']=config.phpserver.editorport;
var phpEditorApp = require('noide');
//phpEditorApp.listen(config.phpserver.editorport);
console.log(c.green.bold('Editor server listening on port ') + c.red.bold(config.phpserver.editorport));

_.each(config.phpserver.scripts, function(script) {
    var shellArgs = ['-f', script];
    var termApp = tty.createServer({
        shell: shell,
        shellArgs: shellArgs,
        static: './static',
        cwd: __dirname,
        port: config.phpserver.port,
    });
    config.phpserver.port++;
    termApp.listen();
});
