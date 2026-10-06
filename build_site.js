const fs = require('fs');
const path = require('path');

const pages = [
  { src: 'home.html', dest: 'index.html', depth: 0 },
  { src: 'projects.html', dest: 'projects/index.html', depth: 1 },
  { src: 'contact.html', dest: 'contact/index.html', depth: 1 },
  { src: 'projects_koto-running.html', dest: 'projects/koto-running/index.html', depth: 2 },
  { src: 'projects_meridian.html', dest: 'projects/meridian/index.html', depth: 2 },
  { src: 'projects_haus.html', dest: 'projects/haus/index.html', depth: 2 },
  { src: 'projects_arkfield.html', dest: 'projects/arkfield/index.html', depth: 2 },
  { src: 'projects_bloom.html', dest: 'projects/bloom/index.html', depth: 2 },
  { src: 'projects_forma-labs.html', dest: 'projects/forma-labs/index.html', depth: 2 },
  { src: 'projects_norde.html', dest: 'projects/norde/index.html', depth: 2 },
  { src: 'projects_velt-studio.html', dest: 'projects/velt-studio/index.html', depth: 2 },
];

function getRelPrefix(depth) {
  if (depth === 0) return './';
  if (depth === 1) return '../';
  if (depth === 2) return '../../';
  return './';
}

pages.forEach(p => {
  const dir = path.dirname(path.join(__dirname, p.dest));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

pages.forEach(page => {
  if (!fs.existsSync(page.src)) {
    console.warn(`File ${page.src} does not exist, skipping.`);
    return;
  }
  let content = fs.readFileSync(page.src, 'utf8');
  const rel = getRelPrefix(page.depth);

  // 1. Replace fonts with local fonts
  content = content.replace(/https:\/\/(?:fonts\.gstatic\.com|framerusercontent\.com)[^\s"'()<>]+?\/([a-zA-Z0-9_-]+\.(?:woff2|woff|ttf))/g, (match, filename) => {
    return `${rel}assets/fonts/${filename}`;
  });

  // 2. Replace images (including query params in src, srcset, style)
  content = content.replace(/https:\/\/framerusercontent\.com\/(?:images|assets)\/([a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|svg|webp))(?:\?[^\s"'()<>]*)?/g, (match, filename) => {
    return `${rel}assets/images/${filename}`;
  });

  // 3. Replace Lenis CSS
  content = content.replace(/https:\/\/unpkg\.com\/lenis@[^/]+\/dist\/lenis\.css/g, `${rel}assets/css/lenis.css`);

  // 4. Remove events.framer.com tracking
  content = content.replace(/<script async src="https:\/\/events\.framer\.com\/script\?v=2"[^>]*><\/script>/g, '');

  // 5. Remove Framer badge container
  content = content.replace(/<div id="__framer-badge-container"[\s\S]*?<\/div>\s*<\/div>/g, '');
  content = content.replace(/<div id="__framer-badge-container"[^>]*>[\s\S]*?<\/div>/g, '');

  // 6. Adjust navigation links according to page depth
  if (page.depth === 0) {
    // Root index.html
    content = content.replace(/href="\.\/projects"/g, 'href="./projects/"');
    content = content.replace(/href="\.\/contact"/g, 'href="./contact/"');
    content = content.replace(/href="\.\/projects\/(koto-running|meridian|haus|arkfield|bloom|forma-labs|norde|velt-studio)"/g, 'href="./projects/$1/"');
  } else if (page.depth === 1 && page.dest.startsWith('projects/')) {
    // projects/index.html
    content = content.replace(/href="\.\/projects\/(koto-running|meridian|haus|arkfield|bloom|forma-labs|norde|velt-studio)"/g, 'href="./$1/"');
    content = content.replace(/href="\.\/contact"/g, 'href="../contact/"');
    content = content.replace(/href="\.\/"/g, 'href="../"');
  } else if (page.depth === 1 && page.dest.startsWith('contact/')) {
    // contact/index.html
    content = content.replace(/href="\.\/projects"/g, 'href="../projects/"');
    content = content.replace(/href="\.\/#about"/g, 'href="../#about"');
    content = content.replace(/href="\.\/contact"/g, 'href="./"');
    content = content.replace(/href="\.\/"/g, 'href="../"');
  } else if (page.depth === 2) {
    // projects/{slug}/index.html
    content = content.replace(/href="\.\.\/projects"/g, 'href="../"');
    content = content.replace(/href="\.\.\/contact"/g, 'href="../../contact/"');
    content = content.replace(/href="\.\.\/"/g, 'href="../../"');
    content = content.replace(/href="\.\/(koto-running|meridian|haus|arkfield|bloom|forma-labs|norde|velt-studio)"/g, 'href="../$1/"');
  }

  // 7. Inject Lenis JS and custom enhancements before </body>
  const enhancementScripts = `
<script src="${rel}assets/js/lenis.min.js"></script>
<script src="${rel}assets/js/main.js"></script>
`;
  content = content.replace('</body>', `${enhancementScripts}</body>`);

  fs.writeFileSync(page.dest, content, 'utf8');
  console.log(`Generated: ${page.dest}`);
});

console.log('Finished building all pages!');
