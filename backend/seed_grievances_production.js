// Seed realistic grievances + production reports linked to REAL mine data
import { createPgClient } from './dbClient.js';
const c = createPgClient();
await c.connect();
console.log('Connected. Seeding grievances and production reports...');

// ---------- GRIEVANCES ----------
const grievances = [
  { grievance_id:'GRV-2026-001', category:'safety',     priority:'critical', subject:'Roof bolting failure in Moonidih Project seam 4', description:'Multiple roof bolts found loose in Seam 4 North panel. Risk of roof collapse for underground workers. CMR Reg 36 mandates immediate inspection and remediation before next shift entry.', submitted_by:'Shri Suresh Nath', mine_name:'Moonidih Project', anonymous:false, status:'in_progress', resolution_notes:'Safety Inspector dispatched. Panel sealed pending re-bolting by 28-Sep-2026.' },
  { grievance_id:'GRV-2026-002', category:'wages',      priority:'high',     subject:'Overtime wages unpaid for August 2026 — Govindpur Colliery', description:'94 workers in Shift-C at Govindpur Colliery have not received overtime payment for 22 hours of emergency production support during the August face recovery operation. CMPDIL payroll system shows no credit.', submitted_by:'Ramesh Kumar Yadav', mine_name:'Govindpur Colliery', anonymous:false, status:'pending', resolution_notes:null },
  { grievance_id:'GRV-2026-003', category:'equipment',  priority:'medium',   subject:'SDL Loader #SL-42 hydraulic failure — Gevra OCP', description:'SDL Loader SL-42 at Gevra OCP Bench-7 has been showing hydraulic pressure warnings for 11 days. Last CMR-mandated statutory service was 38 days ago (limit: 30 days). Risk of equipment failure during loaded haul.', submitted_by:'Er. Manjit Singh Brar', mine_name:'Gevra OCP', anonymous:false, status:'resolved', resolution_notes:'Equipment serviced on 22-Sep-2026. Hydraulic pump replaced. CMR Form 23 countersigned by Chief Mining Engineer.' },
  { grievance_id:'GRV-2026-004', category:'welfare',    priority:'low',      subject:'Drinking water supply disrupted — Rajhara mine surface area', description:'Potable water supply at Rajhara surface canteen and change room has been disrupted for 5 days due to pipeline maintenance. Workers must travel 1.2 km for water access. The Mines Act 1952 Reg 19 requires adequate water supply within mine premises.', submitted_by:'Anil Kumar Verma', mine_name:'Rajhara', anonymous:false, status:'pending', resolution_notes:null },
  { grievance_id:'GRV-2026-005', category:'safety',     priority:'high',     subject:'Missing safety signage at Rajmahal OCP blasting zone', description:'Critical blasting zone warning signs are missing on the eastern access road near Rajmahal OCP Bench 11. Three workers were unaware of scheduled blast at 14:30 hrs on 24-Sep-2026. CMR Reg 167 mandatory signage requirements not met.', submitted_by:'Anonymous', mine_name:'Rajmahal OCP', anonymous:true, status:'in_progress', resolution_notes:'Mine Safety Officer notified. Signage reinstalled 25-Sep-2026. Blast protocol re-communicated to all shift supervisors.' },
  { grievance_id:'GRV-2026-006', category:'harassment', priority:'high',     subject:'Workplace harassment complaint — Bhubaneswari OCP', description:'Female technical staff member reports verbal harassment by a shift supervisor on 20-Sep-2026 during site inspection at Bhubaneswari OCP. Formal POSH complaint filed per Internal Complaints Committee requirements. Confidential investigation requested.', submitted_by:'Anonymous', mine_name:'Bhubaneswari OCP', anonymous:true, status:'pending', resolution_notes:null },
  { grievance_id:'GRV-2026-007', category:'welfare',    priority:'medium',   subject:'Inadequate PPE distribution — Rohne OCP, Shift B workers', description:'Shift-B workers at Rohne OCP report receiving worn-out hard hats from the 2023 procurement batch. CMR Reg 115 requires replacement of PPE showing visible damage. 34 workers affected across 3 work-faces.', submitted_by:'Shri Deepak Pandey', mine_name:'Rohne', anonymous:false, status:'resolved', resolution_notes:'New Karam Safety helmets procured from CMPF-approved vendor. Distributed to all Shift-B workers on 24-Sep-2026. Old equipment disposed under CMR Reg 120.' },
  { grievance_id:'GRV-2026-008', category:'other',      priority:'low',      subject:'Delay in ESI medical claim reimbursement — North Arkhapal', description:'Seven workers at North of Arkhapal Srirampur mine report ESI medical reimbursement claims pending for over 90 days. Claims submitted in July 2026 for treatment following a minor conveyor incident. ESIC office follow-up requested.', submitted_by:'Shri Biswajit Pradhan', mine_name:'North of Arkhapal Srirampur', anonymous:false, status:'in_progress', resolution_notes:'Matter escalated to ESIC regional office Bhubaneswar. Reference No: ESIC-OD-2026-4471. Expected resolution by 15-Oct-2026.' },
];

for (const g of grievances) {
  await c.query(`
    INSERT INTO public.grievances (grievance_id, category, priority, subject, description, submitted_by, mine_name, anonymous, status, resolution_notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (grievance_id) DO NOTHING
  `, [g.grievance_id, g.category, g.priority, g.subject, g.description, g.submitted_by, g.mine_name, g.anonymous, g.status, g.resolution_notes]);
}
console.log(`✅ Inserted ${grievances.length} grievances`);

// ---------- PRODUCTION REPORTS ----------
const shifts = ['A', 'B', 'C'];
const mineTargets = {
  'Gevra OCP':               { target: 8500, range: [7200, 8800] },
  'Govindpur Colliery':      { target: 2500, range: [2100, 2700] },
  'Moonidih Project':        { target: 1800, range: [1400, 1950] },
  'Rajhara':                 { target: 3200, range: [2800, 3400] },
  'Bhubaneswari OCP':        { target: 6200, range: [5400, 6500] },
  'Rajmahal OCP':            { target: 4800, range: [4100, 5000] },
  'Rohne':                   { target: 2200, range: [1800, 2400] },
};
const officers = ['Shri R. K. Mahapatra', 'Er. Rajesh Kumar Singh', 'Shri A. K. Singh', 'Shri Pradeep Kumar', 'Er. Manjit Singh Brar', 'Shri S. N. Pandey'];
const randomBetween = (a, b) => Math.round(a + Math.random() * (b - a));

const prodReports = [];
const mineNames = Object.keys(mineTargets);
for (let daysAgo = 0; daysAgo <= 14; daysAgo++) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const dateStr = d.toISOString().slice(0, 10);
  for (const mine of mineNames) {
    for (const shift of shifts) {
      const conf = mineTargets[mine];
      const extracted = randomBetween(conf.range[0], conf.range[1]);
      const isUnderground = mine.includes('Moonidih') || mine.includes('Rohne') || mine.includes('Urtan');
      prodReports.push({
        report_date: dateStr,
        mine_name: mine,
        shift,
        coal_extracted_mt: (extracted / 3).toFixed(2),
        overburden_removed_bcm: isUnderground ? 0 : (randomBetween(15000, 45000) / 3).toFixed(0),
        active_machines: randomBetween(6, 18),
        workforce_deployed: randomBetween(140, 380),
        blasts_conducted: isUnderground ? randomBetween(2, 8) : randomBetween(1, 4),
        safety_incidents: Math.random() < 0.05 ? 1 : 0,
        target_mt: (conf.target / 3).toFixed(2),
        submitted_by: officers[Math.floor(Math.random() * officers.length)],
        status: daysAgo > 0 ? 'approved' : 'pending',
        remarks: daysAgo === 0 ? 'Routine shift report.' : '',
      });
    }
  }
}

let prodCount = 0;
for (const r of prodReports) {
  try {
    await c.query(`
      INSERT INTO public.production_reports 
        (report_date, mine_name, shift, coal_extracted_mt, overburden_removed_bcm, active_machines, workforce_deployed, blasts_conducted, safety_incidents, target_mt, submitted_by, status, remarks)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    `, [r.report_date, r.mine_name, r.shift, r.coal_extracted_mt, r.overburden_removed_bcm, r.active_machines, r.workforce_deployed, r.blasts_conducted, r.safety_incidents, r.target_mt, r.submitted_by, r.status, r.remarks]);
    prodCount++;
  } catch (e) { /* skip duplicates */ }
}
console.log(`✅ Inserted ${prodCount} production reports (15 days × 7 mines × 3 shifts)`);

await c.end();
console.log('✅ All seeding complete!');
