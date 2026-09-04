import { Client } from 'pg';
import crypto from 'crypto';

const client = new Client({ connectionString: 'postgresql://postgres:Shubham%40123@db.pkynukxdzwlywrxcwtay.supabase.co:5432/postgres' });

const minesData = [
  { name: 'Jharia Block II', type: 'Opencast', subsidiary: 'BCCL', region: 'Jharkhand', state: 'Jharkhand', lat: 23.75, lng: 86.41, radius_m: 5000, status: 'active' },
  { name: 'Gevra OCP', type: 'Opencast', subsidiary: 'SECL', region: 'Chhattisgarh', state: 'Chhattisgarh', lat: 22.33, lng: 82.53, radius_m: 6000, status: 'active' },
  { name: 'Kusmunda OCP', type: 'Opencast', subsidiary: 'SECL', region: 'Chhattisgarh', state: 'Chhattisgarh', lat: 22.33, lng: 82.60, radius_m: 5500, status: 'active' },
  { name: 'Dipka OCP', type: 'Opencast', subsidiary: 'SECL', region: 'Chhattisgarh', state: 'Chhattisgarh', lat: 22.32, lng: 82.55, radius_m: 5000, status: 'active' },
  { name: 'Jayant OCP', type: 'Opencast', subsidiary: 'NCL', region: 'Madhya Pradesh', state: 'Madhya Pradesh', lat: 24.12, lng: 82.64, radius_m: 4500, status: 'active' },
  { name: 'Dudhichua OCP', type: 'Opencast', subsidiary: 'NCL', region: 'Madhya Pradesh', state: 'Madhya Pradesh', lat: 24.13, lng: 82.66, radius_m: 4000, status: 'active' },
  { name: 'Nigahi OCP', type: 'Opencast', subsidiary: 'NCL', region: 'Madhya Pradesh', state: 'Madhya Pradesh', lat: 24.11, lng: 82.60, radius_m: 4200, status: 'active' },
  { name: 'Khadia OCP', type: 'Opencast', subsidiary: 'NCL', region: 'Uttar Pradesh', state: 'Uttar Pradesh', lat: 24.14, lng: 82.70, radius_m: 3800, status: 'active' },
  { name: 'Talcher OCP', type: 'Opencast', subsidiary: 'MCL', region: 'Odisha', state: 'Odisha', lat: 20.95, lng: 85.23, radius_m: 7000, status: 'active' },
  { name: 'Ib Valley OCP', type: 'Opencast', subsidiary: 'MCL', region: 'Odisha', state: 'Odisha', lat: 21.82, lng: 83.92, radius_m: 4500, status: 'active' },
  { name: 'Singareni Collieries', type: 'Underground', subsidiary: 'SCCL', region: 'Telangana', state: 'Telangana', lat: 17.55, lng: 80.62, radius_m: 3500, status: 'active' },
  { name: 'Neyveli Lignite', type: 'Opencast', subsidiary: 'NLC', region: 'Tamil Nadu', state: 'Tamil Nadu', lat: 11.53, lng: 79.48, radius_m: 6500, status: 'active' },
  { name: 'Rajmahal OCP', type: 'Opencast', subsidiary: 'ECL', region: 'Jharkhand', state: 'Jharkhand', lat: 25.03, lng: 87.35, radius_m: 3000, status: 'active' },
  { name: 'Raniganj Coalfield', type: 'Underground', subsidiary: 'ECL', region: 'West Bengal', state: 'West Bengal', lat: 23.62, lng: 87.13, radius_m: 5500, status: 'active' },
  { name: 'Wardha Valley', type: 'Opencast', subsidiary: 'WCL', region: 'Maharashtra', state: 'Maharashtra', lat: 19.95, lng: 79.28, radius_m: 4200, status: 'active' },
  { name: 'Umrer OCP', type: 'Opencast', subsidiary: 'WCL', region: 'Maharashtra', state: 'Maharashtra', lat: 20.85, lng: 79.31, radius_m: 3500, status: 'active' },
  { name: 'Makum Coalfield', type: 'Opencast', subsidiary: 'NEC', region: 'Assam', state: 'Assam', lat: 27.28, lng: 95.73, radius_m: 2500, status: 'active' },
  { name: 'Kamptee Coalfield', type: 'Opencast', subsidiary: 'WCL', region: 'Maharashtra', state: 'Maharashtra', lat: 21.22, lng: 79.18, radius_m: 3200, status: 'active' }
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
