const fs = require('fs');
const path = require('path');

const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv)).argv;

// https://github.com/juanelas/base64
const base64 = require('@juanelas/base64');


if (!argv.input) {
    console.log('input directory or file required');
    return -1;
}
if (!argv.output) {
    console.log('output file required');
    return -1;
}
if (!argv.output.endsWith('.js') && !argv.output.endsWith('.json')) {
    console.log('output file must be .json or .js');
    return -1;
}

let extText = ['txt', 'html', 'hbs', 'cpp', 'c', 'h', 'ino', 'properties', 'js', 'ts'];
if (argv.extText) {
    for(let s of argv.extJson.split(',')) {
        let s = s.trim();
        extText.push(s);
    }
}

let extJson = ['json'];
if (argv.extJson) {
    for(let s of argv.extJson.split(',')) {
        let s = s.trim();
        extJson.push(s);
    }
}

let outputJson = {};

const stats = fs.statSync(argv.input, {throwIfNoEntry: false});
if (!stats) {
    console.log('input cannot be read');
    return -1;
}

if (stats.isFile()) {
    processFile(argv.input);
}

else {
    for(const dirEnt of fs.readdirSync(argv.input, {withFileTypes:true})) {
        if (dirEnt.isFile() && !dirEnt.name.startsWith('.')) {
            processFile(path.join(argv.input, dirEnt.name));
        }
    }
}

let outputStr = '';
if (argv.exportDefault) {
    outputStr += 'module.exports = ';
}

if (argv.indent) {
    outputStr += JSON.stringify(outputJson, null, argv.indent);
}
else {
    outputStr += JSON.stringify(outputJson);
}
fs.writeFileSync(argv.output, outputStr);

//
//
//
function processFile(filePath) {
    const pathComponents = path.parse(filePath);

    let ext = pathComponents.ext;
    if (ext.startsWith('.')) {
        ext = ext.substring(1);
    }

    if (argv.v) {
        console.log('processing', {
            filePath,
            ext,
            name: pathComponents.name,
        });    
    }

    if (extJson.includes(ext)) {
        outputJson[pathComponents.name] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    else
    if (extText.includes(ext)) {
        outputJson[pathComponents.name] = fs.readFileSync(filePath, 'utf8');
    }
    else {
        // false = URL safe disabled
        // true = padding enabled
        outputJson[pathComponents.name] = base64.encode(fs.readFileSync(filePath), false, true);
    }
}
