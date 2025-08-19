// Simple test to verify leads are loading
const testLeads = async () => {
  console.log('Testing Leads Loading...\n');

  try {
    // Test 1: Check if leads are loading
    console.log('1. Testing basic leads endpoint...');
    const response = await fetch('/api/leads');
    
    if (response.ok) {
      const leads = await response.json();
      console.log('✅ Basic leads endpoint works:', leads.length, 'leads found');
      
      if (leads.length > 0) {
        console.log('Sample lead:', leads[0]);
      }
    } else {
      console.log('❌ Basic leads endpoint failed:', await response.text());
    }

    // Test 2: Check filter endpoint
    console.log('\n2. Testing filter endpoint...');
    const filterResponse = await fetch('/api/leads/filter?page=1&limit=10');
    
    if (filterResponse.ok) {
      const filterData = await filterResponse.json();
      console.log('✅ Filter endpoint works:', filterData.leads.length, 'leads out of', filterData.total);
    } else {
      console.log('❌ Filter endpoint failed:', await filterResponse.text());
    }

    // Test 3: Add some test leads via bulk upload
    console.log('\n3. Testing bulk upload...');
    const bulkData = {
      leads: [
        {
          companyName: "Test Company Alpha",
          founderName: "John Alpha",
          contact: "+1234567890",
          email: "john@alpha.com",
          phone: "+1234567890",
          serviceType: "Grant"
        },
        {
          companyName: "Test Company Beta",
          founderName: "Jane Beta",
          contact: "+0987654321",
          email: "jane@beta.com",
          phone: "+0987654321",
          serviceType: "Equity"
        }
      ]
    };

    const bulkResponse = await fetch('/api/leads/bulk-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bulkData)
    });

    if (bulkResponse.ok) {
      const bulkResult = await bulkResponse.json();
      console.log('✅ Bulk upload successful:', bulkResult.message);
    } else {
      console.log('❌ Bulk upload failed:', await bulkResponse.text());
    }

    // Test 4: Check if new leads appear
    console.log('\n4. Checking for new leads...');
    const finalResponse = await fetch('/api/leads/filter?page=1&limit=20');
    
    if (finalResponse.ok) {
      const finalData = await finalResponse.json();
      console.log('✅ Final check:', finalData.leads.length, 'leads out of', finalData.total);
    } else {
      console.log('❌ Final check failed:', await finalResponse.text());
    }

  } catch (error) {
    console.log('❌ Test error:', error.message);
  }

  console.log('\n✅ Lead testing completed!');
};

// Make it available in browser
if (typeof window !== 'undefined') {
  window.testLeads = testLeads;
  console.log('Test function available as window.testLeads()');
} else {
  testLeads();
}
