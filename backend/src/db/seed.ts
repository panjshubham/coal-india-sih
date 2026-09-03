import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coal_india',
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Starting DB setup...');
    
    // 1. Create Schema
    const schemaSql = `
      DROP TABLE IF EXISTS audit_ledger CASCADE;
      DROP TABLE IF EXISTS sync_events CASCADE;
      DROP TABLE IF EXISTS violations CASCADE;
      DROP TABLE IF EXISTS inspections CASCADE;
      DROP TABLE IF EXISTS contractors CASCADE;
      DROP TABLE IF EXISTS mines CASCADE;

      CREATE TABLE mines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        subsidiary VARCHAR(255) NOT NULL,
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        radius_m INTEGER DEFAULT 500
      );

      CREATE TABLE contractors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        license_no VARCHAR(100) NOT NULL,
        license_expiry DATE NOT NULL
      );

      CREATE TABLE inspections (
        id SERIAL PRIMARY KEY,
        mine_id INTEGER REFERENCES mines(id),
        contractor_id INTEGER REFERENCES contractors(id),
        date TIMESTAMP NOT NULL DEFAULT NOW(),
        inspector_name VARCHAR(255) NOT NULL,
        synced_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE violations (
        id SERIAL PRIMARY KEY,
        mine_id INTEGER REFERENCES mines(id),
        inspection_id INTEGER REFERENCES inspections(id),
        regulation_ref VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'OPEN',
        severity VARCHAR(50) DEFAULT 'MEDIUM',
        created_at TIMESTAMP DEFAULT NOW(),
        escalated_at TIMESTAMP
      );

      CREATE TABLE sync_events (
        id SERIAL PRIMARY KEY,
        client_uuid UUID UNIQUE NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE audit_ledger (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        record_id INTEGER NOT NULL,
        action VARCHAR(50) NOT NULL,
        data_hash TEXT NOT NULL,
        prev_hash TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE OR REPLACE FUNCTION prevent_audit_modifications()
      RETURNS TRIGGER AS $$
      BEGIN
          RAISE EXCEPTION 'audit_ledger is append-only. UPDATE and DELETE are not allowed.';
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_prevent_audit_modifications
      BEFORE UPDATE OR DELETE ON audit_ledger
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_modifications();
    `;
    await client.query(schemaSql);
    console.log('Schema created successfully.');

    // 2. Seed Data
    console.log('Seeding data...');
    const insertMines = `
      INSERT INTO mines (name, type, subsidiary, lat, lng, radius_m) VALUES
      ('Gevra Open Cast', 'Open Cast', 'SECL', 22.3394, 82.5936, 1000),
      ('Dipka Open Cast', 'Open Cast', 'SECL', 22.3275, 82.5441, 1000),
      ('Jharia Underground', 'Underground', 'BCCL', 23.7500, 86.4200, 500),
      ('Rajmahal Open Cast', 'Open Cast', 'ECL', 25.0441, 87.3551, 800)
    `;
    await client.query(insertMines);

    const insertContractors = `
      INSERT INTO contractors (name, license_no, license_expiry) VALUES
      ('Acme Mining Corp', 'LIC-2023-001', '2026-12-31'),
      ('Apex Excavations', 'LIC-2022-045', '2026-10-15'),
      ('Global Safety Partners', 'LIC-2024-012', '2026-09-10')
    `;
    await client.query(insertContractors);

    // Mock inspections and violations (e.g. repeated ventilation issues)
    const insertInsp = `
      INSERT INTO inspections (mine_id, date, inspector_name) VALUES
      (3, NOW() - INTERVAL '30 days', 'Raj Kumar'),
      (3, NOW() - INTERVAL '15 days', 'Raj Kumar'),
      (3, NOW() - INTERVAL '2 days', 'Anita Desai'),
      (1, NOW() - INTERVAL '5 days', 'Sunil Sharma')
    `;
    await client.query(insertInsp);

    const insertViolations = `
      INSERT INTO violations (mine_id, inspection_id, regulation_ref, description, status, severity) VALUES
      (3, 1, 'DGMS Circular 5', 'Inadequate ventilation at face 4', 'CLOSED', 'HIGH'),
      (3, 2, 'DGMS Circular 5', 'Ventilation fans malfunctioning', 'CLOSED', 'HIGH'),
      (3, 3, 'DGMS Circular 5', 'Airflow below minimum threshold', 'OPEN', 'CRITICAL'),
      (1, 4, 'Mines Act Sec 19', 'Missing safety signage on haul road', 'OPEN', 'MEDIUM')
    `;
    await client.query(insertViolations);

    console.log('Seed data inserted successfully.');
  } catch (err) {
    console.error('Error setting up DB:', err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
