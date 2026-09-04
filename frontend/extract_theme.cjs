const fs = require('fs');

const html = fs.readFileSync('C:\\Users\\SHUBHAM PANJIYARA\\.gemini\\antigravity-ide\\brain\\ec899ff9-41cc-418a-83ba-57734e398c4f\\.system_generated\\steps\\168\\content.md', 'utf8');
const match = html.match(/tailwind\.config = (\{[\s\S]*?\});/);

if (match) {
  const configStr = match[1].replace(/'/g, '"');
  const config = eval(`(${configStr})`);
  
  const ext = config.theme.extend;
  let css = '@theme {\n';
  
  for (const [k, v] of Object.entries(ext.colors || {})) {
    css += `  --color-${k}: ${v};\n`;
  }
  
  for (const [k, v] of Object.entries(ext.spacing || {})) {
    css += `  --spacing-${k}: ${v};\n`;
  }
  
  for (const [k, v] of Object.entries(ext.borderRadius || {})) {
    const name = k === 'DEFAULT' ? 'radius' : `radius-${k}`;
    css += `  --${name}: ${v};\n`;
  }
  
  for (const [k, v] of Object.entries(ext.fontFamily || {})) {
    css += `  --font-${k}: ${v.join(', ')};\n`;
  }
  
  for (const [k, v] of Object.entries(ext.fontSize || {})) {
    const size = v[0];
    const lh = v[1].lineHeight;
    const fw = v[1].fontWeight;
    const ls = v[1].letterSpacing;
    css += `  --text-${k}: ${size};\n`;
    css += `  --text-${k}--line-height: ${lh};\n`;
    css += `  --text-${k}--font-weight: ${fw};\n`;
    css += `  --text-${k}--letter-spacing: ${ls};\n`;
  }
  
  css += '}\n';
  fs.writeFileSync('c:\\Users\\SHUBHAM PANJIYARA\\Desktop\\coal india\\frontend\\src\\theme.css', css);
  console.log("Written to theme.css");
} else {
  console.log("No config found");
}
