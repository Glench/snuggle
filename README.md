snuggle
============
THIS DOESN'T WORK YET
---------------------

You shouldn't have to worry about static...asset management.

Snuggle is a simple, pluggable, generic static asset manager for web applications. It does preprocessing, concatenation, and compression for CSS/JavaScript/Less/SASS/CoffeeScript/etc.

Example
-------

Say you have a directory of static modules like this:

    public/
        js/
            1.js
            2.js
            lib/
                3.js
                4.js
        css/
            a.css
            b.css

Using snuggle, you'd have a `snuggle.conf.json` file like this:

    fill very basic conf in (no combined)

Now run `snuggle` in your `public` folder and the `output` directory will now contain c.global.js and c.global.css, minified and combined.

Easy enough. Now let's get more complicated.

    public/
        coffee/
            1.coffee
            2.coffee
            lib/
                3.coffee
                4.coffee
        less/
            a.less
            b.less

Here we're using [CoffeeScript](http://coffeescript.org/) and [LessCSS](http://lesscss.org/) files. We might then have a `snuggle.conf.json` like this:

    fill this in with coffeescript/less examples plus combined files example

Features
--------
* Generic enough for almost all preprocessors and minimizers (Less, CoffeeScript, YUICompressor, UglifyJS, SCSS, and more).

* Caches the latest compiled/minimized files so you only recompile the files that have changed.

* Automatically rewrites URLs in files to work in resultant combined files.

Install
-------
    npm install snuggle

You will also have to install your favorite preprocessors and minimizers so that snuggle will have access to them on the command line.

Usage
-----
    snuggle [options] [filename]

If you don't supply `filename` then snuggle will try snuggle.conf.json.

Options:

* `-h` or `--help` -- Show help options.

* `-v` or `--verbose` -- Log more output in the console.

Configuration
-------------
All options should probably go in a `snuggle.conf.json` file in the root of your static directory, but don't need to (just specify on the command line the file you want). Here are all the options that can go in that file:

* `css_base_dir`: A string of the path to your CSS (or equivalent) input files e.g. `"./public/css"`

* `js_base_dir`: A string of the path to your JavaScript (or equivalent) input files e.g. `"./public/js"`

* `output_dir`: A string of the path where you want the combined/compressed output to be stored e.g. `"./public_output"`

* `compiled_cache_dir`: A string of the path where snuggle should store its cached files (will be created automatically if it doesn't already exist. E.g. `"./.snuggle_cache"`

* `global_css_filename`: A string of the file name where any files not specified in `combined` (see below) will end up. E.g. `"c.global.css"`

* `global_js_filename`: A string of the file name where any JavaScript files not specified in `combined` (see below) will end up. E.g. `"c.global.js"`

* `processors`: A hash map consisting of:

    * A `key`: string of the file extension you want to process e.g. `"js"` or `"less"`

    * A `value`: A string or array of strings of the process commands you want to run for each file type. An array is used when a file needs preprocessing (such as in Less or CoffeeScript) before being minimized. In this case, the second item in the array should be the name of another processor in this hash map. If a command line utility needs an input or output file specified, this can be done with the `{input}` and `{output}` template variables. Otherwise, `stdin` and `stdout` will be used. E.g. `"java -jar YUICompressor.jar {input}"` or `["coffee -c {input} {output}", "js"]` or `["lessc", "css"]`

        {
            "js": "uglifyjs -o {output}",
            "less": ["lessc", "css"],
            "css": "java -jar YUICompressor.jar {input}"
        }

* `combined`: A hash map consisting of:
    * A `key`: string key of the final combined file name e.g. `"c.profile.js"` or `"c.profile.css"`
    * A `value`: array of strings of full file paths to the resources that should be combined into the combined file e.g. `[ "js/profile-internal.js", "js/profile-external.js"  ]`

A good example of these options is in the `example` directory in this project.
