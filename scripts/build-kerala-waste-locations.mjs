// scripts/build-kerala-waste-locations.mjs
import fs from 'fs';

// Load OSM raw data
const rawOsm = JSON.parse(fs.readFileSync('scripts/osm-raw-kerala.json'));

console.log('Total raw OSM elements:', rawOsm.length);
