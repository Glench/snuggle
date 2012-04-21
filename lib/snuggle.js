var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    crypto = require('crypto'),
    commandRunner = require('commandRunner'),
    file = require('file'),
    _ = require('underscore');


var invertObject = function(object) {
    // Turns {a: 1, b: 2, c: 3, d: 3} into {1: ['a'], 2: ['b'], 3: ['c', 'd']}

    return _.reduce(_.keys(object), function (memo, combined_file) {
        return _.reduce(object[combined_file], function (inner_memo, current_file) {
            if (inner_memo[current_file] === undefined) {
                inner_memo[current_file] = [];
            }
            inner_memo[current_file].push(combined_file);
            return inner_memo;
        },
        memo);
    },
    {});
};



var main = function(staticConfig) {
    var processors = staticConfig.processors,
        inverseAssetMap = invertOjbect(staticConfig.combined);

    var checkCache = function(filePath) {
        var hash = crypto.createHash('md5'),
            assetStream = fs.ReadStream(filePath);

        assetStream.on('error', function(err) {
            throw "Error reading file '" + filePath + "': " + err;
        });
        assetStream.on('data', function(d) {
            hash.update(d);
        });
        assetStreams.on('end', function() {
            var digest = hash.digest('hex'),
                firstDir = digest.slice(0,2),
                secondDir = digest.slice(2,4),
                cachedPath = path.join(staticConfig.compiled_cache_dir, firstDir, secondDir, path.join(path.basename(filePath), '.', digest));
                // something like '/tmp/snuggle_cache/ab/cd/style.css.abcd123567890
            // TODO: try to `cat` data to combined file(s) unless there's an error
        });
    };

    var recurseWalk = function(err, dirPath, dirs, files) {
        var i;
        // walk and compile all files
        for (i = 0; i < files.length; ++i) {
            var f = path.join(dirPath, files[i]);
            if (processors[path.extname(f)]) {
                checkCache(f);
            } else {
                util.error('No processor found for file: ' + f);
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

exports.main = main;
