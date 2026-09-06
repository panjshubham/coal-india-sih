import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; 

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Cannot run cron.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Setup Nodemailer transporter (Fallback to a test account or console logging if no SMTP provided)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_USER || 'ethereal_test',
    pass: process.env.SMTP_PASS || 'ethereal_test',
  }
});

async function sendEmailAlert(to, subject, html) {
  if (!process.env.SMTP_HOST) {
    console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
    return true;
  }
  
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"CoalGuard System" <noreply@coalguard.local>',
      to,
      subject,
      html
    });
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
}

async function fetchSettings() {
  const defaults = { dueSoonDays: 3, escalationDays: 7, enableEmailAlerts: true };
  try {
    const { data } = await supabase.from('system_settings').select('key, value');
    if (data) {
      const ds = data.find(s => s.key === 'due_soon_days');
      if (ds) defaults.dueSoonDays = parseInt(ds.value, 10);
      
      const es = data.find(s => s.key === 'escalation_days');
      if (es) defaults.escalationDays = parseInt(es.value, 10);
      
      const em = data.find(s => s.key === 'enable_email_alerts');
      if (em) defaults.enableEmailAlerts = em.value === 'true';
    }
  } catch (err) {
    console.warn('Could not fetch system_settings. Using default thresholds.');
  }
  return defaults;
}

async function getAdminEmails() {
  try {
    const { data } = await supabase.from('users').select('email').eq('role', 'corporate');
    if (data && data.length > 0) return data.map(u => u.email).join(', ');
  } catch (e) {}
  return 'admin@coalguard.local';
}

async function generateDailyAlerts() {
  console.log(`[${new Date().toISOString()}] Starting daily alert generation...`);

  try {
    const settings = await fetchSettings();
    let alertCount = 0;
    const now = new Date();
    const dueSoonThreshold = new Date();
    dueSoonThreshold.setDate(now.getDate() + settings.dueSoonDays);

    const escalationThreshold = new Date();
    escalationThreshold.setDate(now.getDate() - settings.escalationDays);

    // 1. Compliance Items (Due Soon & Overdue)
    const { data: complianceItems } = await supabase
      .from('compliance_items')
      .select('id, title, due_date, status')
      .neq('status', 'completed');

    if (complianceItems) {
      for (const item of complianceItems) {
        const dueDate = new Date(item.due_date);
        let alertType = null;
        let message = '';
        let severity = 'low';

        if (dueDate < now) {
          alertType = 'overdue';
          message = `Overdue Compliance: ${item.title}`;
          severity = 'high';
        } else if (dueDate <= dueSoonThreshold) {
          alertType = 'due_soon';
          message = `Due Soon (within ${settings.dueSoonDays} days): ${item.title}`;
          severity = 'moderate';
        }

        if (alertType) {
          const { data: existing } = await supabase.from('alerts')
            .select('id')
            .eq('related_entity_id', item.id)
            .eq('related_entity_type', 'compliance')
            .eq('type', alertType)
            .maybeSingle();

          if (!existing) {
            await supabase.from('alerts').insert({
              type: alertType,
              related_entity_id: item.id,
              related_entity_type: 'compliance',
              message,
              severity,
              is_read: false
            });
            alertCount++;

            if (settings.enableEmailAlerts) {
              const adminEmails = await getAdminEmails();
              await sendEmailAlert(
                adminEmails, 
                `[CoalGuard] ${message}`, 
                `<p><strong>Action Required:</strong> ${message}</p><p>Due Date: ${item.due_date}</p><p><a href="http://localhost:5174/compliance">View Compliance Dashboard</a></p>`
              );
            }
          }
        }
      }
    }

    // 2. Escalation for Stale Violations
    const { data: staleViolations } = await supabase.from('violations')
      .select('id, category, created_at')
      .eq('status', 'open')
      .is('corrective_action', null)
      .lt('created_at', escalationThreshold.toISOString());
    
    if (staleViolations) {
      for (const v of staleViolations) {
        const { data: existing } = await supabase.from('alerts')
          .select('id')
          .eq('related_entity_id', v.id)
          .eq('related_entity_type', 'violation')
          .eq('type', 'escalation')
          .maybeSingle();

        if (!existing) {
          const message = `ESCALATION: Stale open violation (${v.category}) overdue for >${settings.escalationDays} days.`;
          await supabase.from('alerts').insert({
            type: 'escalation',
            related_entity_id: v.id,
            related_entity_type: 'violation',
            message,
            severity: 'critical',
            is_read: false
          });
          alertCount++;

          if (settings.enableEmailAlerts) {
            const adminEmails = await getAdminEmails();
            await sendEmailAlert(
              adminEmails, 
              `[CoalGuard ESCALATION] Violation ${v.id}`, 
              `<p><strong>Escalation Alert:</strong> ${message}</p><p>This violation has been open since ${v.created_at} with no corrective action recorded.</p><p><a href="http://localhost:5174/violations/${v.id}">Review Violation</a></p>`
            );
          }
        }
      }
    }

    console.log(`[${new Date().toISOString()}] Generated ${alertCount} new alerts successfully.`);
  } catch (error) {
    console.error('Error generating daily alerts:', error);
  }
}

generateDailyAlerts();
