var SSH = require('ssh2'),
    config = require('./config.json');

var conn = new SSH();
conn.on('connect', function() {
    console.log('Connection :: connect');
});

conn.on('ready', function() {
    console.log('Connection :: ready');
    conn.exec('uptime', function(err, stream) {
        if (err) throw err;
        stream.on('data', function(data, extended) {
            console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ') + data);
        });
        stream.on('end', function() {
            console.log('Stream :: EOF');
        });
        stream.on('close', function() {
            console.log('Stream :: close');
        });
        stream.on('exit', function(code, signal) {
            console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
            conn.end();
        });
    });
});

conn.on('error', function(err) {
    console.log('Connection :: error :: ' + err);
});
conn.on('end', function() {
    console.log('Connection :: end');
});
conn.on('close', function(had_error) {
    console.log('Connection :: close');
});

// 连接
conn.connect(config);