import React, { useState } from 'react';
import supabase from './supabase';

function GitHubAuthTest() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const testGitHubAuth = async () => {
    try {
      setStatus('Testing GitHub OAuth...');
      setError('');
      
      console.log('Supabase URL:', supabase.supabaseUrl);
      console.log('Current URL:', window.location.href);
      
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('Redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: redirectUrl
        }
      });
      
      if (error) {
        setError(`OAuth Error: ${error.message}`);
        console.error('OAuth Error:', error);
        return;
      }
      
      setStatus('OAuth initiated successfully');
      console.log('OAuth Response:', data);
      
    } catch (err) {
      setError(`Exception: ${err.message}`);
      console.error('Exception:', err);
    }
  };

  const checkSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('Current session:', data, error);
      setStatus(`Session: ${data?.session ? 'Found' : 'None'}`);
    } catch (err) {
      setError(`Session check error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>GitHub Auth Debug</h3>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={testGitHubAuth}>Test GitHub OAuth</button>
        <button onClick={checkSession} style={{ marginLeft: '10px' }}>Check Session</button>
      </div>
      {status && <div style={{ color: 'blue' }}>Status: {status}</div>}
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
    </div>
  );
}

export default GitHubAuthTest;
