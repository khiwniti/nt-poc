#!/usr/bin/env node
/**
 * Test actual API responses to see what counts are returned
 */
import fetch from 'node-fetch';
const BASE_URL = 'http://localhost:3000/api/v1';
// Mock JWT token for testing (in real scenario, we'd need valid auth)
const AUTH_TOKEN = 'test-token-for-verification';
async function testAPIResponses() {
    console.log('='.repeat(80));
    console.log('BACKEND API RESPONSE VERIFICATION');
    console.log('='.repeat(80));
    console.log('Testing API endpoints at:', BASE_URL);
    console.log('Timestamp:', new Date().toISOString());
    console.log('');
    try {
        // Test 1: GET /api/facilities
        console.log('1. Testing GET /api/facilities');
        try {
            const facilitiesResponse = await fetch(`${BASE_URL}/facilities`, {
                headers: {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
            });
            if (facilitiesResponse.ok) {
                const facilitiesData = (await facilitiesResponse.json());
                console.log('   Status:', facilitiesResponse.status);
                console.log('   Response structure:', JSON.stringify(facilitiesData, null, 2));
                console.log('   Facilities count from API:', facilitiesData.total || facilitiesData.data?.length || 0);
            }
            else {
                console.log('   Status:', facilitiesResponse.status);
                console.log('   Error:', await facilitiesResponse.text());
            }
        }
        catch (error) {
            console.log('   Failed to fetch:', error.message);
        }
        console.log('');
        // Test 2: GET /api/facilities/map
        console.log('2. Testing GET /api/facilities/map');
        try {
            const mapResponse = await fetch(`${BASE_URL}/facilities/map`, {
                headers: {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
            });
            if (mapResponse.ok) {
                const mapData = (await mapResponse.json());
                console.log('   Status:', mapResponse.status);
                console.log('   Facilities count from map endpoint:', mapData.total || 0);
                console.log('   Sample facility:', JSON.stringify(mapData.data?.[0] || {}, null, 2));
            }
            else {
                console.log('   Status:', mapResponse.status);
                console.log('   Error:', await mapResponse.text());
            }
        }
        catch (error) {
            console.log('   Failed to fetch:', error.message);
        }
        console.log('');
        // Test 3: Check for dashboard/system status endpoint
        console.log('3. Testing potential dashboard endpoints');
        const dashboardEndpoints = [
            '/dashboard',
            '/system/status',
            '/../health', // Health is at /health not /api/v1/health
            '/metrics',
            '/stats',
        ];
        for (const endpoint of dashboardEndpoints) {
            try {
                const response = await fetch(`${BASE_URL}${endpoint}`, {
                    headers: {
                        Authorization: `Bearer ${AUTH_TOKEN}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    console.log(`   ✓ ${endpoint} exists`);
                    console.log('     Response:', JSON.stringify(data, null, 2));
                }
                else if (response.status !== 404) {
                    console.log(`   ? ${endpoint} - Status ${response.status}`);
                }
            }
            catch {
                // Endpoint doesn't exist or network error
            }
        }
        console.log('');
        // Test 4: Check alerts endpoint
        console.log('4. Testing GET /api/alerts');
        try {
            const alertsResponse = await fetch(`${BASE_URL}/alerts`, {
                headers: {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
            });
            if (alertsResponse.ok) {
                const alertsData = (await alertsResponse.json());
                console.log('   Status:', alertsResponse.status);
                console.log('   Total alerts:', alertsData.total || alertsData.data?.length || 0);
                if (alertsData.data && alertsData.data.length > 0) {
                    console.log('   Sample alert:', JSON.stringify(alertsData.data[0], null, 2));
                }
            }
            else {
                console.log('   Status:', alertsResponse.status);
                console.log('   Error:', await alertsResponse.text());
            }
        }
        catch (error) {
            console.log('   Failed to fetch:', error.message);
        }
        console.log('');
        // Test 5: Check battery health endpoint
        console.log('5. Testing GET /api/battery-health');
        try {
            const batteryResponse = await fetch(`${BASE_URL}/battery-health`, {
                headers: {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
            });
            if (batteryResponse.ok) {
                const batteryData = (await batteryResponse.json());
                console.log('   Status:', batteryResponse.status);
                console.log('   Response:', JSON.stringify(batteryData, null, 2));
            }
            else {
                console.log('   Status:', batteryResponse.status);
                console.log('   Error:', await batteryResponse.text());
            }
        }
        catch (error) {
            console.log('   Failed to fetch:', error.message);
        }
        console.log('');
        console.log('='.repeat(80));
        console.log('API TESTING COMPLETE');
        console.log('='.repeat(80));
    }
    catch (error) {
        console.error('Error during API testing:', error);
    }
}
testAPIResponses();
