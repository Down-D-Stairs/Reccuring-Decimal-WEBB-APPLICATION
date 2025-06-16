import React, { useState, useEffect } from 'react';
import './ModeratorManager.css';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ModeratorManager({ onBack, user }) {
  const [moderators, setModerators] = useState([]);
  const [newModeratorEmail, setNewModeratorEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  

  useEffect(() => {
    fetchModerators();
  }, []);

  const fetchModerators = async () => {
    try {
      const response = await fetch(`${API_URL}/api/moderators`);
      const data = await response.json();
      setModerators(data);
    } catch (error) {
      console.error('Failed to fetch moderators:', error);
      setMessage('Failed to load moderators');
    }
  };

  const addModerator = async () => {
    if (!newModeratorEmail.trim()) {
      setMessage('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/moderators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: newModeratorEmail.trim(), 
          addedBy: user.username 
        })
      });

      if (response.ok) {
        setNewModeratorEmail('');
        setMessage('Moderator added successfully!');
        fetchModerators();
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to add moderator');
      }
    } catch (error) {
      console.error('Error adding moderator:', error);
      setMessage('Failed to add moderator');
    } finally {
      setIsLoading(false);
    }
  };

  const removeModerator = async (email) => {
    if (!window.confirm(`Are you sure you want to remove ${email} as a moderator?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/moderators/${email}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessage('Moderator removed successfully!');
        fetchModerators();
      } else {
        setMessage('Failed to remove moderator');
      }
    } catch (error) {
      console.error('Error removing moderator:', error);
      setMessage('Failed to remove moderator');
    }
  };

  return (
    <div className="moderator-management">
      <div className="header">
        <h1>Manage Moderators</h1>
        <button className="back-btn" onClick={onBack}>
          Back to Dashboard
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="add-moderator-section">
        <h2>Add New Moderator</h2>
        <div className="add-moderator-form">
          <input
            type="email"
            placeholder="Enter email address"
            value={newModeratorEmail}
            onChange={(e) => setNewModeratorEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addModerator()}
            disabled={isLoading}
          />
          <button 
            onClick={addModerator}
            disabled={isLoading || !newModeratorEmail.trim()}
            className="add-btn"
          >
            {isLoading ? 'Adding...' : 'Add Moderator'}
          </button>
        </div>
      </div>

      <div className="moderators-list-section">
        <h2>Current Moderators ({moderators.length})</h2>
        {moderators.length === 0 ? (
          <p className="no-moderators">No moderators found</p>
        ) : (
          <div className="moderators-list">
            {moderators.map(moderator => (
              <div key={moderator.email} className="moderator-item">
                <div className="moderator-info">
                  <span className="email">{moderator.email}</span>
                  <span className="added-info">
                    Added by {moderator.addedBy} on {new Date(moderator.addedDate).toLocaleDateString()}
                  </span>
                </div>
                <button 
                  onClick={() => removeModerator(moderator.email)}
                  className="remove-btn"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModeratorManager;