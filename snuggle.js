var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    program = require('commander'),
    _ = require('underscore');

program
    .version('0.0.1')
    .option('-i, --input [json file]', 'Static assets map input file [static_config.json]', 'static_config.json')
    .option('-o, --output [directory]', 'Directory to store combined/compressed assets')
    .option('-c, --cache [file]', 'JSON cache file [.snuggle_cache.json]', '.snuggle_cache.json')
    .parse(process.argv);

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

// read the static config JSON file
fs.readFile(program.input, function(staticConfigErr, staticConfigJSON) {
    if (staticConfigErr) { throw staticConfigErr; }

    // read MD5 cache file if it exists
    fs.readFile(program.cache, function(cacheErr, md5JSON) {
        var staticConfig = JSON.parse(staticConfigJSON),
            md5Cache = cacheErr ? {} : JSON.parse(md5JSON),
            processors = staticConfig.processors,
            inverseAssetMap = invertOjbect(staticConfig.combined);

        // loop over all assets, figure out if they've changed, and compile them
        _.each(inverseAssetMap, function(filePath, combinedFilePath){
            var extension = path.extname(filePath),
                processor = processors[extension];
            if (processor) {
                
            } else {
                util.error('No processor found for file: ' + filePath);
            }
        });
    });
});
