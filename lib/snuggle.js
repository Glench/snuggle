var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    crypto = require('crypto'),
    os = require('os'),

    file = require('file'),
    _ = require('underscore'),
    SimpleQueue = require('SimpleQueue'),
    touch = require('touch'),
    temp = require('temp'),
    logger = require('logger').createLogger(),

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
        var extName = path.extname(filePath).slice(1);
        var processor = globalConfig.processors[extName];

        if (!_.isObject(processor)) {
            processor = {"cmd": processor, "fileType": extName};
        }

        var fullCachePath = path.join(globalConfig.compiled_cache_dir, cachePath);
        if (path.existsSync(fullCachePath)) {
            var lastExt = processor.next;
            while (_.isObject(processor) && processor.next) {
                processor = globalConfig.processors[processor.next];
            }
            if (_.isObject(processor)) {
                lastExt = processor.fileType;
            }
            touch(fullCachePath, {}, function () {
                finishFile({"path": fullCachePath, "ext": lastExt});
            });
        } else {
            if (processor.next) {
                // This is a preprocessed file, we run recursively with a tempfile
                temp.open({"suffix": "." + processor.next}, function (err, tempInfo) {
                    if (err) {
                       throw "Could not open tempfile for file '" + filePath + "'. Error: " + err;
                    } else {
                        commandRunner.runCommand(processor.cmd, filePath, tempInfo.path, function () {
                            handleFile(tempInfo.path, function (result) {
                               fs.close(tempInfo.fd);
                               finishFile(result);
                           });
                        });
                    }
                });
            } else {
                commandRunner.runCommand(processor.cmd, filePath, fullCachePath, function () {
                    finishFile({"path": fullCachePath, "ext": processor.fileType});
                });
            }
        }
    });
};

// combinedfile: list of pieces
var combinedFilePieces = {};

var buildCombiningInfo = function (cachedPath, originalPath, trueExt) {
    console.log(trueExt, cachedPath, originalPath);
    var combinedFilePaths;
    if (_.has(globalConfig.combined, originalPath)) {
        combinedFilePaths = globalConfig.combined[originalPath];
    } else {
        combinedFilePaths = [globalConfig['default_' + trueExt + '_filename']];
    }
    _.each(combinedFilePaths, function(combinedFilePath) {
        if (!_.has(combinedFilePieces, combinedFilePath)) {
            combinedFilePieces[combinedFilePath] = [];
        }
        combinedFilePieces[combinedFilePath].push(cachedPath);
    });
};

var combiningStage = function (currentTargetFile, currentWriteStream) {
    if (_.isEmpty(combinedFilePieces)) {
        logger.debug("Done!");
        return;
    }
    if (!currentTargetFile) {
        currentTargetFile = _.keys(combinedFilePieces).pop();
        currentWriteStream = fs.createWriteStream(currentTargetFile);
    }

    if (!combinedFilePieces[currentTargetFile].length) {
        currentWriteStream.end();
        delete combinedFilePieces[currentTargetFile];
        combiningStage();
        return;
    }

    var nextReadableFile = combinedFilePieces[currentTargetFile].pop();
    var readableStream = fs.createReadStream(nextReadableFile);
    readableStream.pipe(currentWriteStream);
    readableStream.on('end', function () {
        combiningStage(currentTargetFile, currentWriteStream);
    });
};

var main = function(staticConfig) {
    // Basic idea:
    // check if asset's extension is supported in processors
    // if it is, read file contents into md5 and search for {cache}/a/b/file.js.abcdefg
    // if it exists, stream to combined file and touch cached file
    // otherwise, process or preprocess file and stream to cache and combined file

    _.extend(globalConfig, staticConfig, {
        inverseAssetMap: utils.invertObject(staticConfig.combined || {})
    });

    // magically the number of workers
    var numWorkers = globalConfig.num_workers || os.cpus().length,
        fileQueue = new SimpleQueue(
            handleFile,
            function(result, err, originalPath) {
                if (err) { throw err; }
                buildCombiningInfo(result.path, originalPath, result.ext);
            },
            combiningStage,
            numWorkers),
        recurseWalk = function(err, dirPath, dirs, files) {
            if (err) {
                logger.warn("Error walking directory: '" + err.path + "': " + err.code);
                return;
            }
            // walk and compile all files
            for (var i = 0; i < files.length; ++i) {
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

    // recursively walk the root css / js directories
    file.walk(staticConfig.css_base_dir, recurseWalk);
    file.walk(staticConfig.js_base_dir, recurseWalk);
};

module.exports.main = main;
module.exports.logger = logger;
