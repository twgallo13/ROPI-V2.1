/**
 * Browser Diagnostic Script for Auth Debugging
 * 
 * Run this in browser console (preview site) to diagnose auth issues.
 * Copy-paste the entire script into browser DevTools console.
 * 
 * Tag: lisa.auth-debug.v0.1.0
 */

(async function runAuthDiagnostics() {
  console.log('🔍 Starting Auth Diagnostics...\n');
  console.log('='.repeat(60));
  
  const report = {
    timestamp: new Date().toISOString(),
    firebase: {},
    auth: {},
    token: {},
    claims: {},
    apiTests: {},
  };
  
  try {
    // 1. Check Firebase Configuration
    console.log('\n📋 Firebase Configuration');
    console.log('-'.repeat(40));
    
    if (typeof firebase === 'undefined') {
      console.error('❌ Firebase SDK not loaded');
      report.firebase.error = 'Firebase SDK not loaded';
      return report;
    }
    
    const app = firebase.app();
    const config = app.options;
    
    report.firebase = {
      projectId: config.projectId,
      authDomain: config.authDomain,
      apiKey: config.apiKey ? `${config.apiKey.substring(0, 20)}...` : 'N/A',
    };
    
    console.log('  Project ID:', config.projectId);
    console.log('  Auth Domain:', config.authDomain);
    console.log('  API Key (first 20):', config.apiKey?.substring(0, 20) + '...');
    
    // 2. Check Auth State
    console.log('\n👤 Auth State');
    console.log('-'.repeat(40));
    
    const auth = firebase.auth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.warn('⚠️  No user signed in');
      report.auth.signedIn = false;
      return report;
    }
    
    report.auth = {
      signedIn: true,
      uid: currentUser.uid,
      email: currentUser.email,
      emailVerified: currentUser.emailVerified,
      displayName: currentUser.displayName,
    };
    
    console.log('  ✅ User signed in');
    console.log('  UID:', currentUser.uid);
    console.log('  Email:', currentUser.email);
    console.log('  Email Verified:', currentUser.emailVerified ? '✅ Yes' : '❌ No');
    console.log('  Display Name:', currentUser.displayName || 'N/A');
    
    // 3. Get ID Token and Claims
    console.log('\n🔐 Token & Claims');
    console.log('-'.repeat(40));
    
    const tokenResult = await currentUser.getIdTokenResult(true);
    const idToken = await currentUser.getIdToken(true);
    
    report.token = {
      tokenPreview: idToken.substring(0, 40) + '...',
      expirationTime: tokenResult.expirationTime,
      issuedAtTime: tokenResult.issuedAtTime,
      authTime: tokenResult.authTime,
    };
    
    report.claims = tokenResult.claims;
    
    console.log('  Token (first 40 chars):', idToken.substring(0, 40) + '...');
    console.log('  Issued At:', tokenResult.issuedAtTime);
    console.log('  Expires At:', tokenResult.expirationTime);
    
    console.log('\n  📄 Custom Claims:');
    
    // Filter out standard JWT fields
    const standardFields = [
      'aud', 'auth_time', 'exp', 'firebase', 'iat', 'iss', 'sub',
      'user_id', 'email', 'email_verified'
    ];
    
    const customClaims = Object.entries(tokenResult.claims)
      .filter(([key]) => !standardFields.includes(key))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    
    if (Object.keys(customClaims).length === 0) {
      console.warn('  ⚠️  No custom claims found');
      console.log('  Expected: { role: "admin" }');
    } else {
      console.log(JSON.stringify(customClaims, null, 4));
    }
    
    // 4. Check Admin Role
    console.log('\n🛡️  Admin Role Check');
    console.log('-'.repeat(40));
    
    const hasAdminClaim = tokenResult.claims.role === 'admin';
    const hasAdminInRoles = Array.isArray(tokenResult.claims.roles) && 
                            tokenResult.claims.roles.includes('admin');
    
    report.claims.hasAdminClaim = hasAdminClaim;
    report.claims.hasAdminInRoles = hasAdminInRoles;
    
    if (hasAdminClaim) {
      console.log('  ✅ Admin role detected: claims.role = "admin"');
    } else if (hasAdminInRoles) {
      console.log('  ✅ Admin role detected: "admin" in claims.roles[]');
    } else {
      console.error('  ❌ No admin role found in token claims');
      console.log('  Expected: claims.role = "admin" OR "admin" in claims.roles[]');
    }
    
    // 5. Test Admin API Endpoints
    console.log('\n🌐 API Endpoint Tests');
    console.log('-'.repeat(40));
    
    const apiBase = window.location.origin;
    const testEndpoints = [
      '/api/admin/settings/users',
      '/api/admin/settings/roles',
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        console.log(`\n  Testing: ${endpoint}`);
        
        const response = await fetch(`${apiBase}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        const statusText = response.ok ? '✅' : '❌';
        console.log(`  ${statusText} Status: ${response.status} ${response.statusText}`);
        
        report.apiTests[endpoint] = {
          status: response.status,
          ok: response.ok,
        };
        
        if (!response.ok) {
          const text = await response.text();
          const preview = text.substring(0, 200);
          console.error(`  Error: ${preview}`);
          report.apiTests[endpoint].error = preview;
        } else {
          console.log(`  ✅ Success`);
        }
      } catch (error) {
        console.error(`  ❌ Network error:`, error.message);
        report.apiTests[endpoint] = {
          error: error.message,
        };
      }
    }
    
    // 6. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    
    const issues = [];
    
    if (!currentUser.emailVerified) {
      issues.push('❌ Email not verified');
    }
    
    if (!hasAdminClaim && !hasAdminInRoles) {
      issues.push('❌ No admin claim in token');
    }
    
    const apiFailures = Object.entries(report.apiTests)
      .filter(([_, result]) => !result.ok)
      .map(([endpoint]) => endpoint);
    
    if (apiFailures.length > 0) {
      issues.push(`❌ API failures: ${apiFailures.join(', ')}`);
    }
    
    if (issues.length === 0) {
      console.log('✅ All checks passed!');
    } else {
      console.log('Issues found:');
      issues.forEach(issue => console.log(`  ${issue}`));
      
      console.log('\n🔧 REMEDIATION STEPS:');
      
      if (!currentUser.emailVerified) {
        console.log('\n1. Email Verification:');
        console.log('   Run server-side:');
        console.log(`   await admin.auth().updateUser('${currentUser.uid}', { emailVerified: true })`);
      }
      
      if (!hasAdminClaim && !hasAdminInRoles) {
        console.log('\n2. Set Admin Claim:');
        console.log('   Run server-side:');
        console.log(`   await admin.auth().setCustomUserClaims('${currentUser.uid}', { role: 'admin' })`);
        console.log('\n   Then refresh token in browser:');
        console.log('   await firebase.auth().currentUser.getIdToken(true)');
      }
      
      if (apiFailures.length > 0) {
        console.log('\n3. After setting claims, refresh token and retry API calls');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error);
    report.error = error.message;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 Full Report Object (copy for support):');
  console.log(JSON.stringify(report, null, 2));
  
  return report;
})();
