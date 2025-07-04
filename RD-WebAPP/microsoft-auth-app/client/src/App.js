import React, { useEffect, useState, useMemo } from 'react';
import * as msal from "@azure/msal-browser";
import ExpenseManager from './Components/ExpenseManager';
import TimeTableManager from './Components/TimeTableManager';
import ModeratorManager from './Components/ModeratorManager'; 

const msalConfig = {
  auth: {
    clientId: "4f97959d-fbe9-4911-9f1b-e425218d5fb4",
    authority: "https://login.microsoftonline.com/955ed657-dd5f-490b-8a55-5abaa73481f2",
    redirectUri: "https://reccuring-decimal-webb-application.onrender.com",
  }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

function App() {
  const [currentView, setCurrentView] = useState('main');
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState(null);

  // Add the admin emails constant
  const ADMIN_EMAILS = useMemo(() => [
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
      await msalInstance.logoutPopup();
      setUser(null);
    } catch (error) {
      console.log("Logout Failed:", error);
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
                cursor: 'pointer'
              }}
            >
              Sign in with Microsoft
            </button>
          )}
        </>
      ) : currentView === 'manage-moderators' ? (
        <ModeratorManager onBack={() => setCurrentView('main')} user={user} />
      ) : currentView === 'expense-manager' ? (
        <ExpenseManager onBack={() => setCurrentView('main')} user={user} />
      ) : currentView === 'timetable' ? (
        <TimeTableManager onBack={() => setCurrentView('main')} user={user} />
      ) : null}
    </div>
  );
}

export default App;
