// Debug script to check bulk upload issues
const debugBulkUpload = async () => {
  console.log('🔍 Debugging Bulk Upload Issue...\\n');

  try {
    // Step 1: Check current leads count
    console.log('1. Checking current leads...');
    const leadsResponse = await fetch('/api/leads/filter?page=1&limit=10');
    
    if (leadsResponse.ok) {
      const leadsData = await leadsResponse.json();
      console.log('✅ Current leads:', {
        total: leadsData.total,
        page: leadsData.page,
        totalPages: leadsData.totalPages,
        sampleLeads: leadsData.leads.slice(0, 3)
      });
    } else {
      console.log('❌ Failed to fetch leads:', await leadsResponse.text());
    }

    // Step 2: Check if there are any leads with "bulk-upload" partner ID
    console.log('\\n2. Checking for bulk upload leads...');
    const bulkUploadResponse = await fetch('/api/leads/filter?page=1&limit=50');
    
    if (bulkUploadResponse.ok) {
      const bulkData = await bulkUploadResponse.json();
      const bulkLeads = bulkData.leads.filter(lead => lead.PartnerId === 'bulk-upload');
      console.log('✅ Bulk upload leads found:', bulkLeads.length);
      
      if (bulkLeads.length > 0) {
        console.log('Sample bulk lead:', bulkLeads[0]);
      }
    }

    // Step 3: Test a simple bulk upload
    console.log('\\n3. Testing bulk upload with sample data...');
    const testLeads = [
      {
        companyName: 'Test Company ' + Date.now(),
        founderName: 'Test Founder',
        contact: '+1234567890',
        email: 'test@example.com',
        serviceType: 'Grant'
      }
    ];

    const uploadResponse = await fetch('/api/leads/bulk-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ leads: testLeads })
    });

    if (uploadResponse.ok) {
      const uploadResult = await uploadResponse.json();
      console.log('✅ Bulk upload result:', uploadResult);
    } else {
      console.log('❌ Bulk upload failed:', await uploadResponse.text());
    }

    // Step 4: Check leads again after upload
    console.log('\\n4. Checking leads after upload...');
    const afterResponse = await fetch('/api/leads/filter?page=1&limit=10');
    
    if (afterResponse.ok) {
      const afterData = await afterResponse.json();
      console.log('✅ Leads after upload:', {
        total: afterData.total,
        sampleLeads: afterData.leads.slice(0, 3)
      });
    }

    // Step 5: Check debug endpoint
    console.log('\\n5. Checking debug endpoint...');
    const debugResponse = await fetch('/api/debug/leads');
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('✅ Debug data:', {
        totalLeads: debugData.totalLeads,
        sampleLead: debugData.sampleLead,
        csvContent: debugData.csvContent
      });
    } else {
      console.log('❌ Debug endpoint failed:', await debugResponse.text());
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

// Make it available globally for browser testing
if (typeof window !== 'undefined') {
  window.debugBulkUpload = debugBulkUpload;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { debugBulkUpload };
}

console.log('Debug script loaded. Run debugBulkUpload() to test bulk upload functionality.');
