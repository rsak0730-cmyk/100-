// Pages legacy branch publishing serves the root, not dist or Vite sources.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
const html = readFileSync('dist/index.html', 'utf8');
if (!html.includes('./assets/') || html.includes('src/showroom/main.ts')) {
  throw new Error('Expected a production build with relative asset URLs');
}
// These two directories are exclusively generated deployment output.
for (const dir of ['assets', 'models']) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(`dist/${dir}`, dir, { recursive: true });
}
writeFileSync('index.html', html);
writeFileSync('.nojekyll', '');
console.log('Production website copied to branch root for legacy GitHub Pages.');
