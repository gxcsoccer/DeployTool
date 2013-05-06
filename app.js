var SSH = require('ssh2'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    config = require('./config.json');

var conn = new SSH(),
    baseDir = '/home/iptv/epg/tomcat/webapps/EPG/Turkcell',
    localBase = 'D:\\gaoxiaochen\\Turkcell';

fs.rmdirSync(localBase);

function copyDirectory(sftp, dir, callback) {
    console.log('opendir: ' + dir);
    sftp.opendir(dir, function(err, handle) {
        if (err) throw err;
        sftp.readdir(handle, function(err, list) {
            if (err) throw err;

            var relativePath = path.relative(baseDir, dir),
                localPath = path.resolve(localBase, relativePath);
            if (!fs.existsSync(localPath)) {
                fs.mkdirSync(localPath);
            }

            async.eachSeries(list || [], function(item, next) {
                var filepath = dir + '/' + item.filename;

                console.log(filepath);
                console.log(item.longname);

                if (/^(\.){1,2}?$/.test(item.filename)) {
                    next();
                } else if (item.longname[0] == 'd') {
                    copyDirectory(sftp, filepath, next);
                } else {
                    sftp.fastGet(filepath, path.join(localPath, item.filename), function(err) {
                        if (err) throw err;
                        next();
                    });
                }
            }, function(err) {
                callback();
            });
        });
    });
}

conn.on('connect', function() {
    console.log('Connection :: connect');
});

conn.on('ready', function() {
    console.log('Connection :: ready');

    conn.sftp(function(err, sftp) {
        if (err) throw err;
        copyDirectory(sftp, baseDir, function() {
            console.log('Transfer Complete.');
            conn.end();
        });
    });
});

conn.on('keyboard-interactive', function(name, instructions, instructionsLang, prompts, finish) {
    finish([config.password]);
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