const fs = require('fs');

const code = fs.readFileSync('assets/framer/w4ynmcip_5OTvYSXGQfhB6OcOeRJZWKWFPONrlJvnIs.b0N6wo9d.mjs', 'utf8');

// Find Od or the component name for stage
const pos = code.indexOf('id:`stage`');
console.log('Found id:`stage` at', pos);
if (pos !== -1) {
  console.log(code.substring(pos - 1500, pos + 800));
}
