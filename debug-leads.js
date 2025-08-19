// Debug script to troubleshoot leads loading
const debugLeads = async () => {
  console.log('🔍 Debugging Leads Loading Issue...\n');

  try {
    // Step 1: Check debug endpoint
    console.log('1. Checking debug endpoint...');
    const debugResponse = await fetch('/api/debug/leads');
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('✅ Debug data:', {
        totalLeads: debugData.totalLeads,
        totalPartners: debugData.totalPartners,
        totalUsers: debugData.totalUsers,
        csvContent: debugData.csvContent
      });
      
      if (debugData.leadsData && debugData.leadsData.length > 0) {
        console.log('✅ Sample lead:', debugData.leadsData[0]);
      } else {
        console.log('❌ No leads found in storage');
      }
    } else {
      console.log('❌ Debug endpoint failed:', await debugResponse.text());
    }

    // Step 2: Try to force reinitialize
    console.log('\n2. Trying to force reinitialize...');
    const reinitResponse = await fetch('/api/debug/reinitialize', {
      method: 'POST'
    });
    
    if (reinitResponse.ok) {
      const reinitData = await reinitResponse.json();
      console.log('✅ Reinitialize result:', reinitData);
    } else {
      console.log('❌ Reinitialize failed:', await reinitResponse.text());
    }

    // Step 3: Check again after reinitialize
    console.log('\n3. Checking again after reinitialize...');
    const finalDebugResponse = await fetch('/api/debug/leads');
    
    if (finalDebugResponse.ok) {
      const finalDebugData = await finalDebugResponse.json();
      console.log('✅ Final debug data:', {
        totalLeads: finalDebugData.totalLeads,
        sampleLead: finalDebugData.sampleLead ? 'Found' : 'Not found'
      });
    } else {
      console.log('❌ Final debug failed:', await finalDebugResponse.text());
    }

    // Step 4: Test basic leads endpoint
    console.log('\n4. Testing basic leads endpoint...');
    const basicResponse = await fetch('/api/leads');
    
    if (basicResponse.ok) {
      const basicLeads = await basicResponse.json();
      console.log('✅ Basic leads endpoint:', basicLeads.length, 'leads found');
    } else {
      console.log('❌ Basic leads endpoint failed:', await basicResponse.text());
    }

    // Step 5: Test filter endpoint
    console.log('\n5. Testing filter endpoint...');
    const filterResponse = await fetch('/api/leads/filter?page=1&limit=10');
    
    if (filterResponse.ok) {
      const filterData = await filterResponse.json();
      console.log('✅ Filter endpoint:', filterData.leads.length, 'leads out of', filterData.total);
    } else {
      console.log('❌ Filter endpoint failed:', await filterResponse.text());
    }

  } catch (error) {
    console.log('❌ Debug error:', error.message);
  }

  console.log('\n🔍 Debug completed!');
};

// Make it available in browser
if (typeof window !== 'undefined') {
  window.debugLeads = debugLeads;
  console.log('Debug function available as window.debugLeads()');
} else {
  debugLeads();
}
