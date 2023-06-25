const fs = require('fs');
const path = require('path');

const util = require('util');
const exec = util.promisify(require('child_process').exec);

const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv)).argv;

const testDir = path.join(__dirname, 'test');

let outputName = argv.rebuild ? 'expected.json' : 'test.json';

let failureCount = 0;

async function runTest(testName) {
    const thisTestDir = path.join(testDir, testName);
    
    if (argv.v) {
        console.log('runTest ' + testName);
    }

    const inDir = path.join(thisTestDir, 'in');
    const statsIn = fs.statSync(inDir, {throwIfNoEntry: false});
    if (!statsIn || !statsIn.isDirectory()) {
        // No input directory
        console.log('skipping ' + testName + ', no in directory');
        failureCount++;
        return;
    }

    const cmd = 'node app.js --input test/' + testName + '/in --output ' + thisTestDir + '/' + outputName;
    const { stdout, stderr } = await exec(cmd);
    if (argv.v) {
        console.log(stdout);
    }

    if (argv.rebuild) {
        return;
    }

    const expectedJson = JSON.parse(fs.readFileSync(path.join(thisTestDir, 'expected.json')));
    const testJson = JSON.parse(fs.readFileSync(path.join(thisTestDir, 'test.json')));

    for(const key in expectedJson) {
        if (typeof expectedJson[key] == 'object' || typeof testJson[key] == 'object') {
            const expectedString = JSON.stringify(expectedJson[key]);
            const testString = JSON.stringify(testJson[key]);
            if (expectedString != testString) {
                console.log('test ' + testName + ' failed, key=' + key );
                console.log('  got=' + testString);
                console.log('  exp=' + expectedString);
                failureCount++;
            }                
        }
        else {
            if (expectedJson[key] != testJson[key]) {
                console.log('test ' + testName + ' failed, key=' + key);
                console.log('  got=' + testJson[key]);
                console.log('  exp=' + expectedJson[key]);
                failureCount++;
            }    
        }
    }
    for(const key in testJson) {
        if (typeof expectedJson[key] == 'undefined') {
            console.log('test ' + testName + ' failed, key=' + key + ' found in test but not expected');
            failureCount++;
        }
    }
}

async function runTests() {
    for(const dirEnt of fs.readdirSync(testDir, {withFileTypes:true})) {
        if (dirEnt.isDirectory()) {
            await runTest(dirEnt.name);
        }
    }
}

async function run() {
    if (!argv.clean || argv.run) {
        await runTests();
    }
            
    if (argv.clean) {
        if (failureCount == 0) {
            for(const dirEnt of fs.readdirSync(testDir, {withFileTypes:true})) {
                if (dirEnt.isDirectory()) {
                    const thisTestDir = path.join(testDir, dirEnt.name);
                    const testOutputPath = path.join(thisTestDir, 'test.json');
                    const statsTest = fs.statSync(testOutputPath, {throwIfNoEntry: false});
                    if (statsTest) {
                        if (argv.v) {
                            console.log('removing ' + testOutputPath);
                        }
                        fs.unlinkSync(testOutputPath);
                    }
                }
            }    
        }
        else {
            console.log('skipping clean, failureCount=' + failureCount);
        }
    }
}

run();
