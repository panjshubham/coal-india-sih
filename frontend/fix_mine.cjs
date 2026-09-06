const fs = require('fs');
let lines = fs.readFileSync('src/pages/MineDashboard.tsx', 'utf8').split('\n');

const prefix = `// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ComplianceItem {
  id: number;
  category: string;
  title: string;
  due_date: string;
  status: string;
  document_url: string;
}

interface Inspection {
  id: number;
  scheduled_date: string;
  status: string;
  findings: string;
}
`;

// Remove the broken lines at the top (until we find interface Violation)
let startIndex = 0;
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('interface Violation')) {
    startIndex = i;
    break;
  }
}

const newLines = [prefix, ...lines.slice(startIndex)];
fs.writeFileSync('src/pages/MineDashboard.tsx', newLines.join('\n'));
console.log('Fixed file top successfully');
