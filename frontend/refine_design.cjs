const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function refineFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Remove shadows
  content = content.replace(/\bshadow-(sm|md|lg|xl|2xl|inner)\b/g, '');
  content = content.replace(/\bshadow-[a-z]+-\d+(\/\d+)?\b/g, ''); // e.g. shadow-amber-500/20

  // 2. Standardize radii (mapping rounded-* to just rounded)
  content = content.replace(/\brounded-(sm|md|lg|xl|2xl|3xl)\b/g, 'rounded');

  // 3. Standardize spacing (mapping invalid numbers to valid ones: 1, 2, 3, 4, 6, 8, 12)
  const spacingPrefixes = '(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-x|space-y)';
  
  // map 5 -> 6 (20px -> 24px)
  let regex = new RegExp(`\\b${spacingPrefixes}-5\\b`, 'g');
  content = content.replace(regex, '$1-6');
  
  // map 7 -> 8 (28px -> 32px)
  regex = new RegExp(`\\b${spacingPrefixes}-7\\b`, 'g');
  content = content.replace(regex, '$1-8');
  
  // map 9, 10, 11 -> 12 (36px, 40px, 44px -> 48px)
  regex = new RegExp(`\\b${spacingPrefixes}-(9|10|11)\\b`, 'g');
  content = content.replace(regex, '$1-12');
  
  // anything bigger than 12 -> 12 (e.g. 14, 16, 20)
  regex = new RegExp(`\\b${spacingPrefixes}-(14|16|20|24|32|40|48|56|64)\\b`, 'g');
  content = content.replace(regex, '$1-12');

  // Also remove negative margins that might break layout or map them
  regex = new RegExp(`\\b-${spacingPrefixes}-5\\b`, 'g');
  content = content.replace(regex, '-$1-6');

  // 4. Remove motion/transforms
  content = content.replace(/\bhover:-translate-y-(0\.5|1|2)\b/g, '');
  content = content.replace(/\bhover:scale-(105|110)\b/g, '');
  content = content.replace(/\bactive:scale-(95|90)\b/g, '');
  content = content.replace(/\banimate-in zoom-in-\d+\b/g, '');
  content = content.replace(/\bhover:shadow-[^\s'"]+\b/g, '');

  // 5. Typography labels
  content = content.replace(/\btext-\[10px\]/g, 'text-[11px]');
  content = content.replace(/\btext-\[9px\]/g, 'text-[11px]');

  // SAFE spacing fix: only fix double spaces inside className strings, DO NOT use global space replacement
  content = content.replace(/className=["']([^"']*)["']/g, (match, classNames) => {
    return 'className="' + classNames.replace(/\s{2,}/g, ' ').trim() + '"';
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

const targetDir = path.join(__dirname, 'src');
console.log(`Scanning directory: ${targetDir}`);
walkDir(targetDir, refineFile);
console.log("Refinement complete.");
