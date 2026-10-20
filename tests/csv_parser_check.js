// Run with: node tests/csv_parser_check.js  (no dependencies)
const fs = require('fs'), path = require('path'), assert = require('assert');
const stub = () => ({addEventListener() {}, classList: {}, style: {}, value: '1', getContext: () => ({}), setPointerCapture() {}});
global.document = {getElementById: stub};
global.window = {addEventListener() {}, devicePixelRatio: 1};
global.requestAnimationFrame = () => {};
global.sessionStorage = {getItem: () => null};
global.localStorage = {};
require('../assets/js/flight-lab-ork-v4.js');
const {parseCsv} = window.FlightLab;

const plain = parseCsv('time,x,y,z\n0,0,0,0\n1,1,0,10\n2,2,1,18\n');
assert.strictEqual(plain.length, 3, 'time,x,y,z template parses');
assert.strictEqual(plain[1].z, 10);

const sample = fs.readFileSync(path.join(__dirname, '..', 'data', 'sample_flight.csv'), 'utf8');
assert.ok(parseCsv(sample).length > 3, 'bundled sample parses');

const exported = parseCsv('time,x,y,z,vx,vy,vz,ax,ay,az\n0,0,0,25,1,1,48,0,0,-9\n1,1,1,30,1,1,40,0,0,-9\n2,1,1,35,1,1,30,0,0,-9\n');
assert.strictEqual(exported[0].vz, 48, 'exported CSV round-trips');

const feet = parseCsv('# Time (s),Altitude (ft),Vertical velocity (ft/s)\n0,0,100\n1,100,50\n2,150,0\n');
assert.ok(Math.abs(feet[2].z - 45.72) < 1e-9, 'feet convert to meters');
assert.ok(Math.abs(feet[0].vz - 30.48) < 1e-9, 'ft/s convert to m/s');
assert.ok(feet.notes.length > 0, 'conversion is reported');

const mph = parseCsv('Time (s),Altitude (m),Vertical velocity (mph)\n0,0,10\n1,5,5\n2,7,0\n');
assert.ok(Math.abs(mph[0].vz - 4.4704) < 1e-9, 'mph convert to m/s');

assert.throws(() => parseCsv('hello,world\n1,2\n'), /header/, 'unrecognized header explains accepted formats');
console.log('PASS: csv parser checks');
