const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else if (name.endsWith('.tsx') || name.endsWith('.ts')) {
      files.push(name);
    }
  }
  return files;
}

const files = getFiles('src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Text Colors
  // If we have text-slate-400, make it text-slate-600 in light mode, text-slate-400 in dark mode
  content = content.replace(/(?<!dark:)text-slate-200/g, 'text-slate-800 dark:text-slate-200');
  content = content.replace(/(?<!dark:)text-slate-300/g, 'text-slate-700 dark:text-slate-300');
  content = content.replace(/(?<!dark:)text-slate-400/g, 'text-slate-600 dark:text-slate-400');
  content = content.replace(/(?<!dark:)text-slate-500/g, 'text-slate-700 dark:text-slate-500');
  content = content.replace(/(?<!dark:)text-white/g, 'text-slate-900 dark:text-white');

  // Colored text needs to be darker in light mode for visibility
  content = content.replace(/(?<!dark:)text-amber-400/g, 'text-amber-700 dark:text-amber-400');
  content = content.replace(/(?<!dark:)text-emerald-400/g, 'text-emerald-700 dark:text-emerald-400');
  content = content.replace(/(?<!dark:)text-blue-400/g, 'text-blue-700 dark:text-blue-400');
  content = content.replace(/(?<!dark:)text-red-400/g, 'text-red-700 dark:text-red-400');
  content = content.replace(/(?<!dark:)text-purple-400/g, 'text-purple-700 dark:text-purple-400');
  content = content.replace(/(?<!dark:)text-indigo-400/g, 'text-indigo-700 dark:text-indigo-400');
  content = content.replace(/(?<!dark:)text-cyan-400/g, 'text-cyan-700 dark:text-cyan-400');
  content = content.replace(/(?<!dark:)text-violet-400/g, 'text-violet-700 dark:text-violet-400');
  content = content.replace(/(?<!dark:)text-rose-400/g, 'text-rose-700 dark:text-rose-400');
  
  // 2. Backgrounds
  // Hardcoded dark backgrounds
  content = content.replace(/(?<!dark:)bg-\[\#0B1326\]/g, 'bg-slate-50 dark:bg-[#0B1326]');
  content = content.replace(/(?<!dark:)bg-\[\#070D18\]/g, 'bg-white dark:bg-[#070D18]');
  content = content.replace(/(?<!dark:)bg-\[\#162032\]/g, 'bg-slate-100 dark:bg-[#162032]');
  content = content.replace(/(?<!dark:)bg-slate-900/g, 'bg-white dark:bg-slate-900');
  content = content.replace(/(?<!dark:)bg-slate-950/g, 'bg-slate-50 dark:bg-slate-950');
  content = content.replace(/(?<!dark:)bg-slate-800/g, 'bg-slate-100 dark:bg-slate-800');
  
  // Colored tinted backgrounds - keep the color but make it lighter in light mode
  content = content.replace(/(?<!dark:)bg-amber-500\/10/g, 'bg-amber-100 dark:bg-amber-500/10');
  content = content.replace(/(?<!dark:)bg-emerald-500\/10/g, 'bg-emerald-100 dark:bg-emerald-500/10');
  content = content.replace(/(?<!dark:)bg-blue-500\/10/g, 'bg-blue-100 dark:bg-blue-500/10');
  content = content.replace(/(?<!dark:)bg-red-500\/10/g, 'bg-red-100 dark:bg-red-500/10');
  content = content.replace(/(?<!dark:)bg-purple-500\/10/g, 'bg-purple-100 dark:bg-purple-500/10');
  content = content.replace(/(?<!dark:)bg-indigo-500\/10/g, 'bg-indigo-100 dark:bg-indigo-500/10');
  content = content.replace(/(?<!dark:)bg-cyan-500\/10/g, 'bg-cyan-100 dark:bg-cyan-500/10');
  content = content.replace(/(?<!dark:)bg-violet-500\/10/g, 'bg-violet-100 dark:bg-violet-500/10');
  content = content.replace(/(?<!dark:)bg-rose-500\/10/g, 'bg-rose-100 dark:bg-rose-500/10');
  
  content = content.replace(/(?<!dark:)bg-amber-500\/20/g, 'bg-amber-200 dark:bg-amber-500/20');
  content = content.replace(/(?<!dark:)bg-emerald-500\/20/g, 'bg-emerald-200 dark:bg-emerald-500/20');
  content = content.replace(/(?<!dark:)bg-blue-500\/20/g, 'bg-blue-200 dark:bg-blue-500/20');
  content = content.replace(/(?<!dark:)bg-red-500\/20/g, 'bg-red-200 dark:bg-red-500/20');
  
  content = content.replace(/(?<!dark:)bg-amber-500\/5/g, 'bg-amber-50 dark:bg-amber-500/5');
  content = content.replace(/(?<!dark:)bg-emerald-500\/5/g, 'bg-emerald-50 dark:bg-emerald-500/5');
  content = content.replace(/(?<!dark:)bg-blue-500\/5/g, 'bg-blue-50 dark:bg-blue-500/5');

  // Fix borders
  content = content.replace(/(?<!dark:)border-slate-800/g, 'border-slate-200 dark:border-slate-800');
  content = content.replace(/(?<!dark:)border-slate-700/g, 'border-slate-300 dark:border-slate-700');
  
  content = content.replace(/(?<!dark:)border-amber-500\/20/g, 'border-amber-300 dark:border-amber-500/20');
  content = content.replace(/(?<!dark:)border-emerald-500\/20/g, 'border-emerald-300 dark:border-emerald-500/20');
  content = content.replace(/(?<!dark:)border-blue-500\/20/g, 'border-blue-300 dark:border-blue-500/20');
  content = content.replace(/(?<!dark:)border-red-500\/20/g, 'border-red-300 dark:border-red-500/20');

  content = content.replace(/(?<!dark:)border-amber-500\/30/g, 'border-amber-400 dark:border-amber-500/30');
  content = content.replace(/(?<!dark:)border-emerald-500\/30/g, 'border-emerald-400 dark:border-emerald-500/30');
  content = content.replace(/(?<!dark:)border-blue-500\/30/g, 'border-blue-400 dark:border-blue-500/30');
  content = content.replace(/(?<!dark:)border-red-500\/30/g, 'border-red-400 dark:border-red-500/30');

  // Deduplicate dark:dark:
  content = content.replace(/dark:dark:/g, 'dark:');
  
  // Deduplicate text-slate-800 dark:text-slate-800 dark:text-slate-200
  // Instead of complex regex, let's just do a clean pass
  content = content.replace(/text-slate-\d+ dark:(text-slate-\d+) dark:text-slate-\d+/g, 'text-slate-800 dark:$1');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
