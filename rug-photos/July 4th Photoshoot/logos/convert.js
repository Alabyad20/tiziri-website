const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');

const svg = fs.readFileSync('./tiziri-icon-dark.svg', 'utf8');
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1000 }
});
const rendered = resvg.render();
const png = rendered.asPng();
fs.writeFileSync('./tiziri-icon-1000x1000.png', png);
console.log('Done: tiziri-icon-1000x1000.png');
