var exec = require('child_process').exec
  , fs = require('fs')
  , path = require('path')
  , mkdirp = require('mkdirp')
  , _ = require('underscore');



var escapeShell = function(cmd) {
  return '"'+cmd.replace(/(["\s'$`\\])/g,'\\$1')+'"';
};

_.templateSettings = {
    interpolate : /\{(.+?)\}/g
};

var runCommand_ = function (processTmpl, inputFile, outputFile, sourcePath, destPath, callback) {
    var useStdin = processTmpl.search("{input}") !== -1 ? false : true,
        useStdout = processTmpl.search("{output}") !== -1 ? false : true,
        snuggle = require('./snuggle'),
        processStr = _.template(processTmpl)({
            input: escapeShell(inputFile),
            output: escapeShell(outputFile),
            source_path: escapeShell(sourcePath),
            dest_path: escapeShell(destPath)
        }),
        stdoutStream;

    if (useStdout) {
        stdoutStream = fs.createWriteStream(outputFile);
        stdoutStream.on('error', function (err) {
                            console.log(this.fd);
                            throw 'Stdout writing to file ' + outputFile + '. Error: ' + err;
                            });
    }

    snuggle.logger.debug("Running " + processStr);

    var subProcess = exec(processStr);

    subProcess.on('error', function () {
                      throw 'stdout error';
                      });
    subProcess.stdin.on('error', function () {
                            throw 'stdout error';
                            });
    subProcess.stdout.on('error', function () {
                             throw 'stdin error';
                         });

    subProcess.stderr.pipe(process.stderr);

    if (stdoutStream) {
        subProcess.stdout.pipe(stdoutStream);
    }

    subProcess.on('exit', function (code) {
                      if (code) {
                          throw "Command '" + processStr + "' failed with status code " + code;
                      } else {
                          callback();
                      }
                  });

    if (useStdin) {
        var inputStream = fs.createReadStream(inputFile);
        inputStream.pipe(subProcess.stdin);
        inputStream.on('error', function (exc) {
                           subProcess.kill();
                           snuggle.logger.error("Error reading file '" + inputFile + "': " + exc);
                       });
    }
};


// Create the directory of the output file if it doesn't exist...
var runCommand = function (processTmpl, inputFile, outputFile, sourcePath, destPath, callback) {
    if (!outputFile) {
        return runCommand_(processTmpl, inputFile, outputFile, sourcePath, destPath, callback);
    }
    var dirPath = path.dirname(outputFile);
    mkdirp(dirPath, function () {
       return runCommand_(processTmpl, inputFile, outputFile, sourcePath, destPath, callback);
    });
    return false;
};


module.exports = {
    "runCommand": runCommand
};
