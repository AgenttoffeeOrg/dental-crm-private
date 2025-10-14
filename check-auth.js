// Quick Auth Diagnostic Script
// Run this in browser console on the signin/signup page

console.log('🔍 AUTH DIAGNOSTIC CHECK');
console.log('========================\n');

// 1. Check localStorage/sessionStorage
console.log('1. Storage Check:');
const keys = Object.keys(localStorage);
const supabaseKeys = keys.filter(k => k.includes('supabase'));
console.log('   Supabase keys in localStorage:', supabaseKeys.length);
if (supabaseKeys.length > 0) {
  supabaseKeys.forEach(key => {
    const value = localStorage.getItem(key);
    try {
      const parsed = JSON.parse(value);
      console.log(`   ${key}:`, {
        hasSession: !!parsed?.access_token,
        user: parsed?.user?.email || 'no user',
        expiresAt: parsed?.expires_at ? new Date(parsed.expires_at * 1000).toLocaleString() : 'N/A'
      });
    } catch (e) {
      console.log(`   ${key}: (not JSON)`);
    }
  });
} else {
  console.log('   ⚠️  No Supabase session found');
}

// 2. Check cookies
console.log('\n2. Cookie Check:');
const cookies = document.cookie.split(';').map(c => c.trim());
const authCookies = cookies.filter(c => c.includes('supabase') || c.includes('auth'));
console.log('   Auth cookies:', authCookies.length);
authCookies.forEach(cookie => {
  const [name] = cookie.split('=');
  console.log('   -', name);
});

// 3. Environment check
console.log('\n3. Environment:');
console.log('   URL:', window.location.href);
console.log('   Origin:', window.location.origin);
console.log('   Path:', window.location.pathname);

// 4. Try to get current session
console.log('\n4. Attempting to get current session...');
if (window.supabase) {
  window.supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.log('   ❌ Error getting session:', error.message);
    } else if (data.session) {
      console.log('   ✅ Session found!');
      console.log('   User:', data.session.user.email);
      console.log('   Expires:', new Date(data.session.expires_at * 1000).toLocaleString());
    } else {
      console.log('   ⚠️  No active session');
    }
  });
} else {
  console.log('   ⚠️  Supabase client not found in window');
  console.log('   (This is normal - client is in module scope)');
}

console.log('\n========================');
console.log('✅ Diagnostic complete!');
console.log('\nTo check your account status:');
console.log('1. Go to Supabase Dashboard → Authentication → Users');
console.log('2. Look for your email');
console.log('3. Check "Email Confirmed" column');


