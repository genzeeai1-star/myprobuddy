// Test script for new lead management features
const testLeadFeatures = async () => {
  console.log('Testing Lead Management Features...\n');

  // Test 1: Bulk Upload
  console.log('1. Testing Bulk Upload...');
  const bulkUploadData = {
    leads: [
      {
        companyName: "Test Company 1",
        founderName: "John Doe",
        contact: "+1234567890",
        email: "john@testcompany1.com",
        phone: "+1234567890",
        serviceType: "Grant"
      },
      {
        companyName: "Test Company 2",
        founderName: "Jane Smith",
        contact: "+0987654321",
        email: "jane@testcompany2.com",
        phone: "+0987654321",
        serviceType: "Equity"
      }
    ]
  };

  try {
    const response = await fetch('/api/leads/bulk-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bulkUploadData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Bulk upload successful:', result.message);
    } else {
      console.log('❌ Bulk upload failed:', await response.text());
    }
  } catch (error) {
    console.log('❌ Bulk upload error:', error.message);
  }

  // Test 2: Filter Leads
  console.log('\n2. Testing Lead Filtering...');
  try {
    const response = await fetch('/api/leads/filter?search=Test&serviceType=Grant&page=1&limit=10');
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Filter successful:', `Found ${result.leads.length} leads out of ${result.total}`);
    } else {
      console.log('❌ Filter failed:', await response.text());
    }
  } catch (error) {
    console.log('❌ Filter error:', error.message);
  }

  // Test 3: Get Users for Assignment
  console.log('\n3. Testing User Retrieval...');
  try {
    const response = await fetch('/api/users');
    
    if (response.ok) {
      const users = await response.json();
      console.log('✅ Users retrieved:', users.length, 'users found');
      
      if (users.length > 0) {
        // Test 4: Assign Lead
        console.log('\n4. Testing Lead Assignment...');
        const leadResponse = await fetch('/api/leads/filter?limit=1');
        if (leadResponse.ok) {
          const leadData = await leadResponse.json();
          if (leadData.leads.length > 0) {
            const leadId = leadData.leads[0].id;
            const userId = users[0].id;
            
            const assignResponse = await fetch(`/api/leads/${leadId}/assign`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ assignedToUserId: userId })
            });
            
            if (assignResponse.ok) {
              console.log('✅ Lead assignment successful');
            } else {
              console.log('❌ Lead assignment failed:', await assignResponse.text());
            }
          }
        }
      }
    } else {
      console.log('❌ Users retrieval failed:', await response.text());
    }
  } catch (error) {
    console.log('❌ Users error:', error.message);
  }

  console.log('\n✅ Lead management features test completed!');
};

// Run the test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.testLeadFeatures = testLeadFeatures;
  console.log('Test function available as window.testLeadFeatures()');
} else {
  // Node.js environment
  testLeadFeatures();
}
