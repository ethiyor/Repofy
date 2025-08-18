// Simple test script to create missing user profiles
const fetch = require('node-fetch');

async function createMissingProfiles() {
  try {
    const response = await fetch('http://localhost:4000/admin/create-missing-profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

createMissingProfiles();
