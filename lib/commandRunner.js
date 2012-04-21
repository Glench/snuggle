var exec = require('child_process').exec
  , fs = require('fs');



var escapeShell = function(cmd) {
  return '"'+cmd.replace(/(["\s'$`\\])/g,'\\$1')+'"';
};

var runCommand = function (processTmpl, inputFile, outputFile, callback) {
    var useStdin = true, useStdout = true;

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
    }

    var subProcess = exec(processTmpl);

    subProcess.stderr.pipe(process.stderr);

    if (stdoutStream) {
        subProcess.stdout.pipe(stdoutStream);
    }

    subProcess.stdout.on('exit', function (code) {
                             if (code) {
                                 callback("Command '" + processTmpl + "' failed with status code " + code);
                             } else {
                                 if (stdoutStream) {
                                     stdoutStream.end();
                                     fs.close(fd, function () {
                                                  callback();
                                              });
                                 } else {
                                     callback();
                                 }
                             }
                         });

    if (useStdin) {
        var inputStream = fs.createReadStream(inputFile);
        inputStream.pipe(subProcess.stdin);
        inputStream.on('error', function (exc) {
                           subProcess.kill();
                           callback("Error reading file '" + inputFile + "': " + exc);
                       });
    }
};



module.exports = {
    "runCommand": runCommand
};