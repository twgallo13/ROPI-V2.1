/**
 * Admin Token Verification Script
 * 
 * Run in preview site browser console AFTER signing in as theo@shiekh.com
 * to verify the admin custom claim is present and admin endpoints work.
 * 
 * Tag: aoss.v0.6.9
 */

(async function verifyAdminToken() {
  console.log('🔍 Verifying Admin Token & Endpoints...\n');
  console.log('='.repeat(60));
  
  try {
    // Check if user is signed in
    const auth = firebase.auth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.error('❌ No user signed in. Please sign in first.');
      return;
    }
    
    console.log('✅ User signed in:', currentUser.email);
    console.log('   UID:', currentUser.uid);
    
    // Force token refresh to get latest claims
    console.log('\n🔄 Refreshing token...');
    await currentUser.getIdToken(true);
    console.log('✅ Token refreshed');
    
    // Get token result with claims
    const tokenResult = await currentUser.getIdTokenResult();
    const idToken = await currentUser.getIdToken();
    
    console.log('\n🔐 Token Claims:');
    console.log(JSON.stringify(tokenResult.claims, null, 2));
    
    // Check for admin role
    const hasAdminRole = tokenResult.claims.role === 'admin';
    console.log('\n🛡️  Admin Role Check:');
    console.log(hasAdminRole ? '✅ Admin role present' : '❌ Admin role missing');
    
    if (!hasAdminRole) {
      console.error('\n❌ Admin claim not found. Expected { role: "admin" }');
      return;
    }
    
    // Test admin endpoints
    console.log('\n🌐 Testing Admin Endpoints:');
    console.log('-'.repeat(60));
    
    const endpoints = [
      '/api/admin/settings/users',
      '/api/admin/settings/roles',
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        console.log(`\n${endpoint}`);
        console.log(`  Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          console.log('  ✅ Success');
          
          // Try to parse response
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log('  Response:', JSON.stringify(data).substring(0, 100) + '...');
          }
        } else {
          console.error('  ❌ Failed');
          const text = await response.text();
          console.error('  Error:', text.substring(0, 200));
        }
      } catch (error) {
        console.error(`  ❌ Network error: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification complete!');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
  }
})();
