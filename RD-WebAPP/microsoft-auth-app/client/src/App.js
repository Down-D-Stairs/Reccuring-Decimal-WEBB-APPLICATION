import React, { useEffect, useState, useMemo } from 'react';
import * as msal from "@azure/msal-browser";
import ExpenseManager from './Components/ExpenseManager';
import TimeTableManager from './Components/TimeTableManager';
import ModeratorManager from './Components/ModeratorManager';
import GuestManagement from './Components/GuestManagement'; // Add this import

const msalConfig = {
  auth: {
    clientId: "4f97959d-fbe9-4911-9f1b-e425218d5fb4",
    authority: "https://login.microsoftonline.com/955ed657-dd5f-490b-8a55-5abaa73481f2",
    redirectUri: "https://reccuring-decimal-webb-application.onrender.com",
  }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

function App() {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'; // Add this
  const [currentView, setCurrentView] = useState('main');
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [guestEmail, setGuestEmail] = useState('');
  const [showGuestLogin, setShowGuestLogin] = useState(false);
 
  // Add the admin emails constant
  const ADMIN_EMAILS = useMemo(() => [
    'pgupta@recurringdecimal.com', // Add pgupta back
    'kkarumudi@recurringdecimal.com',
    'sn@recurringdecimal.com'
  ], []);

  useEffect(() => {
    msalInstance.initialize().then(() => {
      setIsInitialized(true);
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        setUser(accounts[0]);
      }
    });
  }, []);

  const handleLogin = async () => {
    if (!isInitialized) return;
     
    try {
      const response = await msalInstance.loginPopup({
        scopes: ["user.read", "profile", "email"]
      });
       
      setUser({
        name: response.account.name,
        username: response.account.username
      });
    } catch (error) {
      console.log("Login Failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      // Check if user is a guest user
      if (user?.isGuest) {
        // For guest users, just clear the state - no Microsoft logout needed
        setUser(null);
        setCurrentView('main');
      } else {
        // For Microsoft users, do the normal Microsoft logout
        await msalInstance.logoutPopup();
        setUser(null);
      }
    } catch (error) {
      console.log("Logout Failed:", error);
      // Fallback: just clear user state
      setUser(null);
    }
  };


  // Fixed guest login function
  const handleGuestLogin = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/guest-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: guestEmail })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user); // Fixed: was onLogin(data.user)
        setShowGuestLogin(false);
        setGuestEmail('');
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Guest login error:', error);
      alert('Login failed. Please try again.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh'
    }}>
      {console.log('Current view:', currentView)}
      {console.log('User:', user)}
      
      {currentView === 'main' ? (
        <>
          <h1>Welcome to Our App</h1>
          {user ? (
            <div style={{ textAlign: 'center' }}>
              {console.log('Rendering logged-in user view')}
              <h2>Welcome, {user.name}!</h2>
              <p>Email: {user.username}</p>
              {user.isGuest && <p style={{color: '#17a2b8'}}>(Guest User)</p>} {/* Show guest indicator */}
               
              <button
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  backgroundColor: '#0078d4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '20px',
                  width: '200px'
                }}
                onClick={() => setCurrentView('expense-manager')}
              >
                Expense Manager
              </button>
              
              {console.log('Rendering logged-in user view')}
              <button
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  backgroundColor: '#0078d4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '20px',
                  width: '200px'
                }}
                onClick={() => setCurrentView('timetable')}
              >
                Timesheet
              </button>
              
              {ADMIN_EMAILS.includes(user.username) && (
                <>
                  <button
                    style={{
                      padding: '12px 24px',
                      fontSize: '16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginBottom: '10px',
                      display: 'block',
                      margin: '10px auto'
                    }}
                    onClick={() => setCurrentView('manage-moderators')}
                  >
                    Manage Moderators
                  </button>
                  
                  {/* Add Guest Management Button */}
                  <button
                    style={{
                      padding: '12px 24px',
                      fontSize: '16px',
                      backgroundColor: '#6f42c1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginBottom: '10px',
                      display: 'block',
                      margin: '10px auto'
                    }}
                    onClick={() => setCurrentView('guest-management')}
                  >
                    Manage Guest Users
                  </button>
                </>
              )}
              
              <button
                onClick={handleLogout}
                style={{
                  padding: '10px 20px',
                  fontSize: '16px',
                  backgroundColor: '#d40000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              {/* Microsoft Login */}
              <button
                onClick={handleLogin}
                disabled={!isInitialized}
                style={{
                  padding: '10px 20px',
                  fontSize: '16px',
                  backgroundColor: '#0078d4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '20px'
                }}
              >
                Sign in with Microsoft
              </button>
              
              {/* Divider */}
              <div style={{ 
                margin: '20px 0', 
                fontSize: '14px', 
                color: '#666',
                position: 'relative'
              }}>
                <span style={{ 
                  backgroundColor: 'white', 
                  padding: '0 10px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  OR
                </span>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: '1px',
                  backgroundColor: '#ddd',
                  zIndex: 0
                }}></div>
              </div>
              
              {/* Guest Login */}
              {!showGuestLogin ? (
                <button
                  onClick={() => setShowGuestLogin(true)}
                  style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Guest Login
                </button>
              ) : (
                <div style={{ 
                  border: '1px solid #ddd', 
                  padding: '20px', 
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <h3 style={{ margin: '0 0 15px 0' }}>Guest Login</h3>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    style={{
                      padding: '10px',
                      fontSize: '16px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginBottom: '10px',
                      width: '250px'
                    }}
                  />
                  <br />
                  <button
                    onClick={handleGuestLogin}
                    disabled={!guestEmail}
                    style={{
                      padding: '10px 20px',
                      fontSize: '16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '10px'
                    }}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setShowGuestLogin(false);
                      setGuestEmail('');
                    }}
                    style={{
                      padding: '10px 20px',
                      fontSize: '16px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : currentView === 'manage-moderators' ? (
        <ModeratorManager onBack={() => setCurrentView('main')} user={user} />
      ) : currentView === 'guest-management' ? (
        <GuestManagement onBack={() => setCurrentView('main')} user={user} />
      ) : currentView === 'expense-manager' ? (
        <ExpenseManager onBack={() => setCurrentView('main')} user={user} />
      ) : currentView === 'timetable' ? (
        <TimeTableManager onBack={() => setCurrentView('main')} user={user} />
      ) : null}
    </div>
  );
}

export default App;
