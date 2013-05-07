var Connection = require('./connection'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    wrench = require('wrench'),
    moment = require('moment'),
    config = require('./config.json'),
    localBase = config.localPath;

/***********************
var logStream = fs.createWriteStream('D:\\gaoxiaochen\\log.txt', {
    flags: 'w',
    encoding: null,
    mode: 0666
});

var console = {
    log: function(str) {
        logStream.write(str);
    }
}
************************/

async.series({
    one: function(done) {
        fs.existsSync(localBase) && wrench.rmdirSyncRecursive(localBase);

        var conn = new Connection(function(sftp) {
            pullDirectory(sftp, config.master.path, localBase, function() {
                console.log('Download Complete.');
                conn.close();
                done();
            });
        });

        conn.connect(config.master.connect)
    },
    two: function(done) {
        async.eachSeries(config.slaves || [], function(item, done) {
            var conn = new Connection(function(sftp) {
                sftp.opendir(item.path, function(err, handle) {
                    if (!err) {
                        sftp.rename(item.path, item.path + '-' + moment().format('YYYY-MM-DD HH:mm'), function(err) {
                            if (err) throw err;
                            pushDirectory(sftp, item.path, localBase, function() {
                                console.log('Sync ' + item.connect.host + ' Complete.');
                                conn.close();
                                done();
                            });
                        });
                    } else {
                        pushDirectory(sftp, item.path, localBase, function() {
                            console.log('Sync ' + item.connect.host + ' Complete.');
                            conn.close();
                            done();
                        });
                    }
                });
            });

            conn.connect(item.connect)
        },

        function(err) {
            if (err) throw err;
            done();
        });
    }
},

function(err) {
    console.log("All Complete.");
});

/**
 * 从主服务器上获取最新代码到本地
 */
function pullDirectory(sftp, remotePath, localPath, callback) {
    sftp.opendir(remotePath, function(err, handle) {
        if (err) throw err;
        sftp.readdir(handle, function(err, list) {
            if (err) throw err;

            if (!fs.existsSync(localPath)) {
                fs.mkdirSync(localPath);
            }

            async.eachLimit(list || [], 25, function(item, done) {
                var filepath = remotePath + '/' + item.filename;

                console.log('Transferring << ' + filepath);
                if (/^(\.){1,2}?$/.test(item.filename)) {
                    done();
                } else if (item.longname[0] == 'd') {
                    pullDirectory(sftp, filepath, path.join(localPath, item.filename), done);
                } else {
                    sftp.fastGet(filepath, path.join(localPath, item.filename), function(err) {
                        if (err) throw err;
                        done();
                    });
                }
            }, function(err) {
                if (err) throw err;
                callback();
            });
        });
    });
}

/**
 * 同步从服务器
 */
function pushDirectory(sftp, remotePath, localPath, callback) {
    var list = fs.readdirSync(localPath);
    sftp.mkdir(remotePath, function(err) {
        if (err) throw err;

        async.eachLimit(list || [], 25, function(item, done) {
            var filepath = path.join(localPath, item),
                stat = fs.statSync(filepath);
            if (/^(\.){1,2}?$/.test(item)) {
                done();
            } else if (stat.isDirectory()) {
                pushDirectory(sftp, remotePath + '/' + item, filepath, done);
            } else {
                console.log('Transferring >> ' + filepath);
                sftp.fastPut(filepath, remotePath + '/' + item, function(err) {
                    if (err) throw err;
                    done();
                });
            }
        }, function(err) {
            if (err) throw err;
            callback();
        })
    });
}