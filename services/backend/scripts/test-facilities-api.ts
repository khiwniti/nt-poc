#!/usr/bin/env tsx
/**
 * Test Facilities API - verify data is accessible
 */

import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { join } from 'path';

// Try to read JWT secret from jwt-secret.txt or fall back to .env value
let JWT_SECRET: string;
try {
  JWT_SECRET = readFileSync(join(process.cwd(), '../../jwt-secret.txt'), 'utf-8').trim();
} catch {
  JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
}

const API_URL = 'http://localhost:3000';

async function testFacilitiesAPI() {
  try {
    console.log('Using JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');

    // Generate a valid JWT token
    const token = jwt.sign(
      { userId: 'test-user', role: 'admin', email: 'test@example.com' },
      JWT_SECRET
    );

    console.log('\n=================================');
    console.log('Testing Facilities API');
    console.log('=================================\n');
    console.log('Generated token:', token.substring(0, 50) + '...\n');

    // Test facilities list endpoint
    const response = await fetch(`${API_URL}/api/v1/facilities`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ API request failed with status ${response.status}`);
      const errorText = await response.text();
      console.error('Error:', errorText);
      process.exit(1);
    }

    const data = (await response.json()) as any;

    console.log('✅ Successfully fetched facilities data!\n');
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('\n=================================');

    if (data.data && Array.isArray(data.data)) {
      console.log(`\n📊 Summary: Found ${data.data.length} facilities`);
      data.data.forEach((facility: any) => {
        console.log(`  - ${facility.name} (${facility.location})`);
      });
    }

    console.log('\n=================================\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing API:', error);
    process.exit(1);
  }
}

testFacilitiesAPI();
