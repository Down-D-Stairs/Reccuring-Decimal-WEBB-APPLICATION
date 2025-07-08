import React, { useState, useEffect } from 'react';
import './GuestManagement.css';

function GuestManagement({ onBack, user }) {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const [guestUsers, setGuestUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGuest, setNewGuest] = useState({
    email: '',
    name: ''
  });

  const ADMIN_EMAILS = [
    'pgupta@recurringdecimal.com',
    'kkarumudi@recurringdecimal.com',
    'sn@recurringdecimal.com'
  ];

  const isAdmin = ADMIN_EMAILS.includes(user?.username);

  useEffect(() => {
    if (isAdmin) {
      fetchGuestUsers();
    }
  }, [isAdmin]);

  const fetchGuestUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/guest-users`);
      const data = await response.json();
      setGuestUsers(data);
    } catch (error) {
      console.error('Error fetching guest users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGuest = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/guest-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newGuest,
          invitedBy: user.username
        })
      });

      if (response.ok) {
        const guestUser = await response.json();
        setGuestUsers([guestUser, ...guestUsers]);
        setNewGuest({ email: '', name: '' });
        setShowAddForm(false);
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error adding guest user:', error);
    }
  };

  const handleToggleModerator = async (guestId, currentStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/guest-users/${guestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isModerator: !currentStatus
        })
      });

      if (response.ok) {
        const updatedGuest = await response.json();
        setGuestUsers(guestUsers.map(guest => 
          guest._id === guestId ? updatedGuest : guest
        ));
      }
    } catch (error) {
      console.error('Error updating moderator status:', error);
    }
  };

  const handleToggleActive = async (guestId, currentStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/guest-users/${guestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !currentStatus
        })
      });

      if (response.ok) {
        const updatedGuest = await response.json();
        setGuestUsers(guestUsers.map(guest => 
          guest._id === guestId ? updatedGuest : guest
        ));
      }
    } catch (error) {
      console.error('Error updating active status:', error);
    }
  };

  const handleDeleteGuest = async (guestId) => {
    if (window.confirm('Are you sure you want to delete this guest user?')) {
      try {
        const response = await fetch(`${API_URL}/api/admin/guest-users/${guestId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setGuestUsers(guestUsers.filter(guest => guest._id !== guestId));
        }
      } catch (error) {
        console.error('Error deleting guest user:', error);
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="guest-management-container">
        <h2>Access Denied</h2>
        <p>Only administrators can manage guest users.</p>
        <button onClick={onBack}>Back to Home</button>
      </div>
    );
  }

  return (
    <div className="guest-management-container">
      <div className="header">
        <h2>Guest User Management</h2>
        <div className="header-buttons">
          <button className="back-button" onClick={onBack}>
            Back to Home
          </button>
          <button 
            className="add-guest-button"
            onClick={() => setShowAddForm(true)}
          >
            Add Guest User
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="add-guest-form">
          <h3>Add New Guest User</h3>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={newGuest.email}
              onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
              placeholder="guest@example.com"
            />
          </div>
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              value={newGuest.name}
              onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
              placeholder="John Doe"
            />
          </div>
          <div className="form-buttons">
            <button onClick={() => setShowAddForm(false)}>Cancel</button>
            <button 
              onClick={handleAddGuest}
              disabled={!newGuest.email || !newGuest.name}
            >
              Add Guest
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading guest users...</div>
      ) : (
        <div className="guest-users-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Invited By</th>
                <th>Invited Date</th>
                <th>Last Login</th>
                <th>Status</th>
                <th>Moderator</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guestUsers.map(guest => (
                <tr key={guest._id}>
                  <td>{guest.name}</td>
                  <td>{guest.email}</td>
                  <td>{guest.invitedBy}</td>
                  <td>{new Date(guest.invitedDate).toLocaleDateString()}</td>
                  <td>
                    {guest.lastLoginDate 
                      ? new Date(guest.lastLoginDate).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                  <td>
                    <span className={`status-badge ${guest.isActive ? 'active' : 'inactive'}`}>
                      {guest.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <span className={`moderator-badge ${guest.isModerator ? 'yes' : 'no'}`}>
                      {guest.isModerator ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      onClick={() => handleToggleActive(guest._id, guest.isActive)}
                      className={guest.isActive ? 'deactivate-btn' : 'activate-btn'}
                    >
                      {guest.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleToggleModerator(guest._id, guest.isModerator)}
                      className="moderator-btn"
                    >
                      {guest.isModerator ? 'Remove Moderator' : 'Make Moderator'}
                    </button>
                    <button
                      onClick={() => handleDeleteGuest(guest._id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {guestUsers.length === 0 && (
            <div className="no-guests">
              <p>No guest users found. Click "Add Guest User" to invite someone.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GuestManagement;
