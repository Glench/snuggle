var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    crypto = require('crypto'),
    file = require('file'),
    _ = require('underscore'),
    SimpleQueue = require('SimpleQueue'),
    touch = require('touch'),
    temp = require('temp'),

    commandRunner = require('./commandRunner'),
    utils = require('./utils');


var getCachePath = function(filePath, callback) {
    var hash = crypto.createHash('md5'),
        assetStream = fs.ReadStream(filePath);

    assetStream.on('error', function(err) {
        throw "Error reading file '" + filePath + "': " + err;
    });
    assetStream.on('data', function (d) { hash.update(d); });

    assetStream.on('end', function () {
        var digest = hash.digest('hex');
        callback(path.join(digest.charAt(0), digest.charAt(1), path.join(path.basename(filePath) + '.' + digest)));
    });
};


var globalConfig = {};


// This function will, for a given file, produce the
// desired cache file. Running through as many preprocessing steps as necessary.
var handleFile = function (filePath, finishFile) {
    getCachePath(filePath, function (cachePath) {
        var fullCachePath = path.join(globalConfig.compiled_cache_dir, cachePath);
        if (path.existsSync(fullCachePath)) {
            touch(fullCachePath, {}, function () {
                finishFile(fullCachePath);
            });
        } else {
            var processor = globalConfig.processors[path.extname(filePath).slice(1)];
            if (_.isArray(processor) && processor[1]) {
                // This is a preprocessed file, we run recursively with a tempfile
                temp.open({"suffix": "." + processor[1]}, function (err, tempInfo) {
                    if (err) {
                       throw "Could not open tempfile for file '" + filePath + "'. Error: " + err;
                    } else {
                        handleFile(tempInfo.path, function () {
                           fs.close(tempInfo.fd);
                           finishFile.apply(this, arguments);
                        });
                    }
                });
            } else {
                commandRunner.runCommand(processor, filePath, fullCachePath, function () {
                    finishFile(fullCachePath);
                });
            }
        }
    });
};


var main = function(staticConfig) {
    _.extend(globalConfig, staticConfig, {
        inverseAssetMap: utils.invertObject(staticConfig.combined)
     });

    // magically the number of workers
    var numWorkers = 4;
    var fileQueue = new SimpleQueue(handleFile, function (err, result, filePath) {}, undefined, numWorkers);

    var recurseWalk = function(err, dirPath, dirs, files) {
        if (err) {
            console.log("Error walking directory: '" + err.path + "': " + err.code);
            return;
        }
        var i;
        // walk and compile all files
        for (i = 0; i < files.length; ++i) {
            var f = files[i];
            if (globalConfig.processors[path.extname(f).slice(1)]) {
                fileQueue.push(f);
            }
        }
        // walk all sub directories
        for (i = 0; i < dirs.length; ++i) {
            file.walk(dirs[i], recurseWalk);
        }
    };

    // Instructions to self:
    // check if extension is supported in processors
    // if it is, read file contents into md5 and search for cache/ab/cd/file.js.abcdefg
    // if it exists, stream to combined file and touch cached file
    // otherwise, process data using either string or list of strings and runCommand, streaming to combined file

    // recursively walk the root css / js directories
    file.walk(staticConfig.css_base_dir, recurseWalk);
    file.walk(staticConfig.js_base_dir, recurseWalk);
};

module.exports.main = main;
