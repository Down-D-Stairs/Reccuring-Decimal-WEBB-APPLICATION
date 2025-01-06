import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../config/authConfig';

function Login() {
  const { instance } = useMsal();
  const [isLoading, setIsLoading] = useState(false);  // Fixed useState declaration

  const handleLogin = () => {
    setIsLoading(true);
    instance.loginPopup(loginRequest)
      .then(response => {
        console.log('Login Success:', response);
      })
      .catch(error => {
        console.log('Login Failed:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Welcome to Our App</h2>
      <button 
        onClick={handleLogin}
        disabled={isLoading}
        style={{ 
          padding: '10px 20px', 
          fontSize: '16px',
          backgroundColor: '#0078d4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          opacity: isLoading ? 0.7 : 1
        }}
      >
        {isLoading ? 'Signing in...' : 'Sign in with Microsoft'}
      </button>
    </div>
  );
}

export default Login;
