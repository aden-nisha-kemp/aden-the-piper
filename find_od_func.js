const fs = require('fs');

const code = fs.readFileSync('assets/framer/w4ynmcip_5OTvYSXGQfhB6OcOeRJZWKWFPONrlJvnIs.b0N6wo9d.mjs', 'utf8');

// Find function Od or var Od
const pos = code.indexOf('function Od(');
const posVar = code.indexOf('var Od=');
console.log('pos function:', pos, 'pos var:', posVar);

const targetPos = pos !== -1 ? pos : posVar;
if (targetPos !== -1) {
  console.log(code.substring(targetPos, targetPos + 2500));
}
