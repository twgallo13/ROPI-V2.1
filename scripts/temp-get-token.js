const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Initialize
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function getIdToken() {
  const uid = 'zmAn8kKTE3ZW3fM386d8tiWW97U2';
  
  // Get user to verify they exist
  const user = await admin.auth().getUser(uid);
  console.error('User found:', user.email);
  
  // Create custom token  
  const customToken = await admin.auth().createCustomToken(uid, { admin: true });
  
  // Exchange custom token for ID token via REST API
  const apiKey = 'AIzaSyD1aYB4AfqU5n1YfSOtLX5nbEYbnlTfcZ8'; // From firebase config
  const response = await fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=' + apiKey,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true })
    }
  );
  const data = await response.json();
  if (data.idToken) {
    console.log(data.idToken);
  } else {
    console.error('Error:', data);
  }
}

getIdToken().catch(e => console.error('Error:', e.message));
