const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function fixComments(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Replace // comments with /* ... */ if they are followed by code on the same line
  content = content.replace(/\/\/([^\n]+?)(?=(import\b|export\b|function\b|const\b|let\b|return\b|window\b|process\b|if\b))/g, '/* $1 */\n');
  
  // Add spaces back for from'y' etc
  content = content.replace(/from(['"])/g, 'from $1');
  content = content.replace(/import\s*\{(.*?)\}\s*from/g, 'import { $1 } from');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed: ' + filePath);
  }
}

walkDir(path.join(__dirname, 'src'), fixComments);
