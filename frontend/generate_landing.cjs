const fs = require('fs');

let html = fs.readFileSync('C:\\Users\\SHUBHAM PANJIYARA\\.gemini\\antigravity-ide\\brain\\ec899ff9-41cc-418a-83ba-57734e398c4f\\.system_generated\\steps\\168\\content.md', 'utf8');

// Extract body inner HTML
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
if (!bodyMatch) {
  console.log("No body found");
  process.exit(1);
}

let jsx = bodyMatch[1];

// Convert class to className
jsx = jsx.replace(/class="/g, 'className="');

// Convert inline styles
jsx = jsx.replace(/style="([^"]+)"/g, (match, styleStr) => {
  const styles = styleStr.split(';').filter(s => s.trim() !== '').reduce((acc, style) => {
    let [key, value] = style.split(':');
    if (!key || !value) return acc;
    key = key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
    acc[key] = value.trim();
    return acc;
  }, {});
  return `style={${JSON.stringify(styles)}}`;
});

// Convert HTML comments to JSX comments
jsx = jsx.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

// Wrap in a component
const component = `import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    minesCount: 1480,
    complianceRate: 99.84,
    alertsCount: 12
  });
  
  const [mines, setMines] = useState([]);

  useEffect(() => {
    async function fetchData() {
      // Fetch stats
      const { count: minesCount } = await supabase.from('mines').select('*', { count: 'exact', head: true });
      const { count: alertsCount } = await supabase.from('alerts').select('*', { count: 'exact', head: true });
      
      if (minesCount !== null) {
        setStats(prev => ({ ...prev, minesCount }));
      }
      
      // Fetch latest mines for table
      const { data } = await supabase.from('mines').select('*').limit(4);
      if (data) {
        setMines(data);
      }
    }
    
    fetchData();
    
    // Subscribe to changes
    const sub = supabase.channel('landing-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
         fetchData();
      })
      .subscribe();
      
    return () => { supabase.removeChannel(sub); };
  }, []);

  return (
    <div className="dark">
      ${jsx}
    </div>
  );
}
`;

fs.writeFileSync('c:\\Users\\SHUBHAM PANJIYARA\\Desktop\\coal india\\frontend\\src\\pages\\Landing.tsx', component);
console.log("Generated Landing.tsx");
