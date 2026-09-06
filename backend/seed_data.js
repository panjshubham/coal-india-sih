import { Client } from 'pg';
import crypto from 'crypto';

const client = new Client({ connectionString: 'postgresql://postgres:Shubham%40123@db.pkynukxdzwlywrxcwtay.supabase.co:5432/postgres' });

const minesData = [
  // 12 specific mines
  { name: 'Govindpur Colliery', type: 'Opencast', subsidiary: 'CCL', region: 'Bokaro', state: 'Jharkhand', lat: 23.79, lng: 85.87, radius_m: 3000, status: 'active' },
  { name: 'Dhori Khas', type: 'Opencast', subsidiary: 'CCL', region: 'Bokaro', state: 'Jharkhand', lat: 23.77, lng: 85.98, radius_m: 3500, status: 'active' },
  { name: 'Karo Spl', type: 'Opencast', subsidiary: 'CCL', region: 'Bokaro', state: 'Jharkhand', lat: 23.78, lng: 85.90, radius_m: 4000, status: 'active' },
  { name: 'Tetaria Khar', type: 'Opencast', subsidiary: 'CCL', region: 'Latehar', state: 'Jharkhand', lat: 23.74, lng: 84.50, radius_m: 3000, status: 'active' },
  { name: 'Kathautia OCP', type: 'Opencast', subsidiary: 'HIL/CCL', region: 'Palamu', state: 'Jharkhand', lat: 24.03, lng: 84.07, radius_m: 2500, status: 'active' },
  { name: 'Rajhara', type: 'Opencast', subsidiary: 'CCL', region: 'Palamu', state: 'Jharkhand', lat: 24.03, lng: 84.03, radius_m: 3000, status: 'active' },
  { name: 'Choritand Tiliaya', type: 'Opencast', subsidiary: 'JSMDC', region: 'Bokaro', state: 'Jharkhand', lat: 23.80, lng: 86.00, radius_m: 3200, status: 'active' },
  { name: 'Jogeshwar & Khas Jogeshwar', type: 'Opencast', subsidiary: 'CCL', region: 'Bokaro', state: 'Jharkhand', lat: 23.85, lng: 85.80, radius_m: 3500, status: 'active' },
  { name: 'Rabodih OCP', type: 'Opencast', subsidiary: 'CCL', region: 'Bokaro', state: 'Jharkhand', lat: 23.82, lng: 85.85, radius_m: 2800, status: 'active' },
  { name: 'Rohne', type: 'Opencast', subsidiary: 'CCL', region: 'Hazaribagh', state: 'Jharkhand', lat: 23.78, lng: 85.30, radius_m: 4000, status: 'active' },
  { name: 'Urtan North', type: 'Underground', subsidiary: 'SECL', region: 'Anuppur', state: 'Madhya Pradesh', lat: 23.50, lng: 80.50, radius_m: 5000, status: 'active' },
  { name: 'North of Arkhapal Srirampur', type: 'Opencast', subsidiary: 'MCL', region: 'Angul', state: 'Odisha', lat: 20.95, lng: 85.15, radius_m: 6000, status: 'active' },
  // 6 additional realistic subsidiary mines
  { name: 'Moonidih Project', type: 'Underground', subsidiary: 'BCCL', region: 'Dhanbad', state: 'Jharkhand', lat: 23.75, lng: 86.35, radius_m: 3000, status: 'active' },
  { name: 'Rajmahal OCP', type: 'Opencast', subsidiary: 'ECL', region: 'Godda', state: 'Jharkhand', lat: 25.03, lng: 87.35, radius_m: 4500, status: 'active' },
  { name: 'Gevra OCP', type: 'Opencast', subsidiary: 'SECL', region: 'Korba', state: 'Chhattisgarh', lat: 22.33, lng: 82.58, radius_m: 7000, status: 'active' },
  { name: 'Bhubaneswari OCP', type: 'Opencast', subsidiary: 'MCL', region: 'Talcher', state: 'Odisha', lat: 20.97, lng: 85.18, radius_m: 5500, status: 'active' },
  { name: 'Jayant OCP', type: 'Opencast', subsidiary: 'NCL', region: 'Singrauli', state: 'Madhya Pradesh', lat: 24.13, lng: 82.65, radius_m: 4800, status: 'active' },
  { name: 'Umrer OCP', type: 'Opencast', subsidiary: 'WCL', region: 'Nagpur', state: 'Maharashtra', lat: 20.85, lng: 79.32, radius_m: 3500, status: 'active' }
];

const contractorsData = [
  { name: 'L&T Mining Services', license_no: 'LIC-LT-001', license_expiry: '2027-12-31' },
  { name: 'BGR Mining & Infra', license_no: 'LIC-BGR-002', license_expiry: '2026-06-30' },
  { name: 'Thriveni Earthmovers', license_no: 'LIC-THR-003', license_expiry: '2028-03-15' },
  { name: 'Sainik Mining', license_no: 'LIC-SAI-004', license_expiry: '2025-11-20' },
  { name: 'Adani Mining Ent', license_no: 'LIC-ADE-005', license_expiry: '2029-01-10' }
];

const complianceCategories = ['safety', 'environment', 'production', 'labour'];
const violationSeverities = ['low', 'medium', 'high', 'critical'];

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function runSeed() {
  try {
    await client.connect();
    console.log("Connected to database. Starting seed process...");

    // Truncate tables to prevent duplicates
    await client.query('TRUNCATE TABLE public.mines CASCADE;');
    await client.query('TRUNCATE TABLE public.contractors CASCADE;');
    console.log("Existing data truncated.");

    // Insert Mines
    const mineIds = [];
    for (const mine of minesData) {
      const res = await client.query(
        `INSERT INTO public.mines (name, type, subsidiary, region, state, lat, lng, latitude, longitude, radius_m, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [mine.name, mine.type, mine.subsidiary, mine.region, mine.state, mine.lat, mine.lng, mine.lat, mine.lng, mine.radius_m, mine.status]
      );
      mineIds.push(res.rows[0].id);
    }
    console.log(`Inserted ${mineIds.length} mines.`);

    // Insert Contractors
    const contractorIds = [];
    for (const contractor of contractorsData) {
      const res = await client.query(
        `INSERT INTO public.contractors (name, license_no, license_expiry) 
         VALUES ($1, $2, $3) RETURNING id`,
        [contractor.name, contractor.license_no, contractor.license_expiry]
      );
      contractorIds.push(res.rows[0].id);
    }
    console.log(`Inserted ${contractorIds.length} contractors.`);

    // Insert 80 Compliance Items
    for (let i = 0; i < 80; i++) {
      const mineId = mineIds[Math.floor(Math.random() * mineIds.length)];
      const category = complianceCategories[Math.floor(Math.random() * complianceCategories.length)];
      
      // Some deliberately overdue
      const isOverdue = Math.random() > 0.7; 
      const dueDate = isOverdue ? randomDate(new Date(2023, 0, 1), new Date()) : randomDate(new Date(), new Date(2027, 11, 31));
      const status = isOverdue ? 'overdue' : (Math.random() > 0.5 ? 'pending' : 'submitted');

      await client.query(
        `INSERT INTO public.compliance_items (mine_id, category, title, due_date, status) 
         VALUES ($1, $2, $3, $4, $5)`,
        [mineId, category, `Compliance Check - ${i}`, dueDate.toISOString().split('T')[0], status]
      );
    }
    console.log(`Inserted 80 compliance items.`);

    // Insert 40 Inspections and Linked Violations
    const inspectionIds = [];
    const violationIds = [];
    for (let i = 0; i < 40; i++) {
      const mineId = mineIds[Math.floor(Math.random() * mineIds.length)];
      const contractorId = contractorIds[Math.floor(Math.random() * contractorIds.length)];
      const inspDate = randomDate(new Date(2025, 0, 1), new Date());
      
      const inspRes = await client.query(
        `INSERT INTO public.inspections (mine_id, contractor_id, date, inspector_name, synced_at) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [mineId, contractorId, inspDate, `Inspector ${Math.floor(Math.random() * 10)}`, new Date()]
      );
      const inspectionId = inspRes.rows[0].id;
      inspectionIds.push(inspectionId);

      // Create a violation for each inspection
      const severity = violationSeverities[Math.floor(Math.random() * violationSeverities.length)];
      const category = complianceCategories[Math.floor(Math.random() * complianceCategories.length)];
      
      const violRes = await client.query(
        `INSERT INTO public.violations (mine_id, inspection_id, regulation_ref, description, status, severity, category, created_at, latitude, longitude) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [mineId, inspectionId, `REG-${Math.floor(Math.random() * 1000)}`, `Violation observed during routine inspection ${i}`, 'open', severity, category, inspDate, minesData[mineIds.indexOf(mineId)].lat, minesData[mineIds.indexOf(mineId)].lng]
      );
      violationIds.push(violRes.rows[0].id);

      // Contractor incident
      if (Math.random() > 0.5) {
        await client.query(
          `INSERT INTO public.contractor_incidents (contractor_id, violation_id, severity, date) 
           VALUES ($1, $2, $3, $4)`,
          [contractorId, violRes.rows[0].id, severity, inspDate]
        );
      }
    }
    console.log(`Inserted 40 inspections and violations, and random contractor incidents.`);

    // Insert AI Detection Pattern: 3 specific mines with same violation category 3+ times in last 90 days
    const patternMines = [mineIds[0], mineIds[1], mineIds[2]];
    const patternCategory = 'safety';
    const now = new Date();
    
    for (const targetMine of patternMines) {
      for (let i = 0; i < 4; i++) {
        // Date within last 90 days
        const patternDate = new Date(now.getTime() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000);
        await client.query(
          `INSERT INTO public.violations (mine_id, regulation_ref, description, status, severity, category, created_at, latitude, longitude) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [targetMine, `REG-AI-PATTERN-${i}`, `Recurring pattern violation ${i}`, 'open', 'high', patternCategory, patternDate, minesData[mineIds.indexOf(targetMine)].lat, minesData[mineIds.indexOf(targetMine)].lng]
        );
      }
    }
    console.log(`Inserted AI Pattern data (4 safety violations in last 90 days for 3 specific mines).`);

  } catch (err) {
    console.error("Error during seeding:", err);
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

runSeed();
