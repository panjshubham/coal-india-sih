import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run the daily alerts script every hour
cron.schedule('0 * * * *', () => {
  console.log('[Cron] Running dailyAlerts.js...');
  exec(`node ${path.join(__dirname, 'dailyAlerts.js')}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Cron Error]: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`[Cron Stderr]: ${stderr}`);
      return;
    }
    console.log(`[Cron Output]: ${stdout}`);
  });
});

console.log('Automated Workflow Cron Scheduler started. Listening for scheduled tasks...');
