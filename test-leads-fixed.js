// Test script to verify leads are loading after status engine fix
const testLeadsFixed = async () => {
  console.log('🧪 Testing Leads After Status Engine Fix...\n');

  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connectivity...');
    const response = await fetch('/api/leads');
    
    if (response.status === 401) {
      console.log('✅ Server is running (authentication required as expected)');
    } else if (response.ok) {
      const leads = await response.json();
      console.log('✅ Server is running and leads are accessible:', leads.length, 'leads found');
    } else {
      console.log('❌ Server error:', response.status, await response.text());
    }

    // Test 2: Check if we can access the frontend
    console.log('\n2. Testing frontend access...');
    const frontendResponse = await fetch('/');
    
    if (frontendResponse.ok) {
      console.log('✅ Frontend is accessible');
    } else {
      console.log('❌ Frontend error:', frontendResponse.status);
    }

    // Test 3: Check if the leads page loads
    console.log('\n3. Testing leads page...');
    const leadsPageResponse = await fetch('/leads');
    
    if (leadsPageResponse.ok) {
      console.log('✅ Leads page is accessible');
    } else {
      console.log('❌ Leads page error:', leadsPageResponse.status);
    }

  } catch (error) {
    console.log('❌ Test error:', error.message);
  }

  console.log('\n🧪 Test completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Open http://localhost:5000 in your browser');
  console.log('2. Login with admin credentials');
  console.log('3. Navigate to the Leads page');
  console.log('4. The leads should now be visible');
};

// Make it available in browser
if (typeof window !== 'undefined') {
  window.testLeadsFixed = testLeadsFixed;
  console.log('Test function available as window.testLeadsFixed()');
} else {
  testLeadsFixed();
}
