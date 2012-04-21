var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    program = require('commander'),
    _ = require('underscore');

program
    .version('0.0.1')
    .parse(process.argv);

var staticConfigPath = program.args[0];

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
fs.readFile(staticConfigPath, function(staticConfigErr, staticConfigJSON) {
    if (staticConfigErr) { throw staticConfigErr; }

    var staticConfig = JSON.parse(staticConfigJSON),
        processors = staticConfig.processors,
        inverseAssetMap = invertOjbect(staticConfig.combined);

    // loop over all assets, figure out if they've changed, and compile them
    _.each(inverseAssetMap, function(filePath, combinedFilePath){
        var extension = path.extname(filePath),
            processor = processors[extension];
        if (processor) {
            // TODO
        } else {
            util.error('No processor found for file: ' + filePath);
        }
    });
});
