var exec = require('child_process').exec
  , fs = require('fs')
  , path = require('path')
  , mkdirp = require('mkdirp');



var escapeShell = function(cmd) {
  return '"'+cmd.replace(/(["\s'$`\\])/g,'\\$1')+'"';
};

var runCommand_ = function (processTmpl, inputFile, outputFile, callback) {
    var useStdin = true, useStdout = true;
    var snuggle = require('./snuggle');

    if (processTmpl.search("{input}") !== -1) {
        processTmpl = processTmpl.replace("{input}", escapeShell(inputFile));
        useStdin = false;
    }
    if (processTmpl.search("{output}") !== -1) {
        processTmpl = processTmpl.replace("{output}", escapeShell(outputFile));
        useStdout = false;
    }

    var stdoutStream;

    if (useStdout) {
        stdoutStream = fs.createWriteStream(outputFile);
        stdoutStream.on('error', function (err) {
                            console.log(this.fd);
                            throw 'Stdout writing to file ' + outputFile + '. Error: ' + err;
                            });
    }

    snuggle.logger.debug("Running " + processTmpl);

    var subProcess = exec(processTmpl);


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
                          throw "Command '" + processTmpl + "' failed with status code " + code;
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
var runCommand = function (processTmpl, inputFile, outputFile, callback) {
    if (!outputFile) {
        return runCommand_(processTmpl, inputFile, outputFile, callback);
    }
    var dirPath = path.dirname(outputFile);
    mkdirp(dirPath, function () {
       return runCommand_(processTmpl, inputFile, outputFile, callback);
    });
    return false;
};


module.exports = {
    "runCommand": runCommand
};
