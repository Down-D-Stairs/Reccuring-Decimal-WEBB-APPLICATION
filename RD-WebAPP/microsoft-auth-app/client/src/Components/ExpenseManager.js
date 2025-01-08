import React, { useState, useEffect, useMemo } from 'react';
import './Login.css';

function ExpenseManager({ onBack, user }) {
  const [trips, setTrips] = useState([]);
  const [expenseView, setExpenseView] = useState('list');  // Only 'list', 'new', 'add-expense', 'approve'
  const [expandedTrip, setExpandedTrip] = useState(null);
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    amountMin: '',
    amountMax: '',
    status: 'all',
    searchTerm: '',
    sortOrder: 'none'
  });
  
  const [tripDetails, setTripDetails] = useState({
    tripName: '',
    employeeName: '',
    dateRange: { start: '', end: '' },
    userEmail: user.email
  });

  const [expenseDetails, setExpenseDetails] = useState({
    vendor: '',
    amount: '',
    date: '',
    comments: '',
    receipt: null
  });

  const [receipts, setReceipts] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ADMIN_EMAILS = useMemo(() => [
    'pgupta@recurringdecimal.com',
    'kkarumudi@recurringdecimal.com',
    'sn@recurringdecimal.com'
  ], []);


  useEffect(() => {
    fetchTrips();
  }, [user]);
  
  const API_URL = process.env.REACT_APP_API_URL;

  const fetchTrips = async () => {
    try {
      console.log('Current user:', user.username);
      console.log('Is admin?', ADMIN_EMAILS.includes(user.username));
      
      const response = await fetch(`${API_URL}/api/trips?userEmail=${user.username}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trips');
      }
      const data = await response.json();
      console.log('All trips from server:', data);
      
      const filteredTrips = ADMIN_EMAILS.includes(user.username)
        ? data
        : data.filter(trip => trip.userEmail === user.username);
      
      console.log('Filtered trips:', filteredTrips);
      setTrips(filteredTrips);
      console.log('Trip data from server:', data); // Add this line
      setTrips(data);
    } catch (error) {
      console.error('Failed to fetch trips:', error);
    }
  };
  
  const applyFilters = (trips) => {
    let filteredTrips = trips.filter(trip => {
      const matchesDate = (!filters.dateStart || new Date(trip.dateRange.start) >= new Date(filters.dateStart)) &&
        (!filters.dateEnd || new Date(trip.dateRange.end) <= new Date(filters.dateEnd));
      
      const matchesStatus = filters.status === 'all' || trip.status === filters.status;
      
      const matchesSearch = !filters.searchTerm ||
        trip.tripName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        trip.employeeName.toLowerCase().includes(filters.searchTerm.toLowerCase());
      
      return matchesDate && matchesStatus && matchesSearch;
    });
  
    if (filters.sortOrder !== 'none') {
      filteredTrips.sort((a, b) => {
        if (filters.sortOrder === 'asc') {
          return a.totalAmount - b.totalAmount;
        } else {
          return b.totalAmount - a.totalAmount;
        }
      });
    }
  
    return filteredTrips;
  };  
  
  

  const handleReceiptUpload = async (file) => {
    const formData = new FormData();
    formData.append('document', file);
  
    try {
      const response = await fetch('https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict', {
        method: 'POST',
        headers: {
          'Authorization': 'Token 13de7c14cd271b1f3415142a1c19e5a3'
        },
        body: formData
      });
  
      const result = await response.json();
      
      if (result.document) {
        const { total_amount, date, supplier_name } = result.document.inference.prediction;
        
        const base64Promise = new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
  
        const base64Receipt = await base64Promise;
        
        setExpenseDetails({
          ...expenseDetails,
          amount: total_amount.value,
          date: date.value,
          vendor: supplier_name.value,
          receipt: base64Receipt
        });
      }
    } catch (error) {
      console.error('Error processing receipt:', error);
    }
  };
  
  const handleExpenseSubmit = (addAnother = false) => {
    setReceipts(prev => [...prev, expenseDetails]);
    setTotalAmount(prev => prev + Number(expenseDetails.amount));
    
    if (addAnother) {
      setExpenseDetails({
        vendor: '',
        amount: '',
        date: '',
        comments: '',
        receipt: null
      });
      document.querySelector('input[type="file"]').value = '';
    } else {
      setExpenseView('new');
    }
  };
  

  const handleStatusChange = async (tripId, newStatus) => {
    setTrips(trips.map(trip => 
      trip._id === tripId ? { ...trip, status: newStatus } : trip
    ));
    try {
      const response = await fetch(`${API_URL}/api/trips/${tripId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          reason: trips.find(t => t._id === tripId)?.reason || ''
        })
      });
      const updatedTrip = await response.json();
      setTrips(trips.map(trip => 
        trip._id === tripId ? updatedTrip : trip
      ));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleReasonChange = (tripId, reason) => {
    setTrips(trips.map(trip => 
      trip._id === tripId ? { ...trip, reason } : trip
    ));
  };

  const handleSubmitDecision = async (tripId) => {
    const trip = trips.find(t => t._id === tripId);
    try {
      const response = await fetch(`${API_URL}/api/trips/${tripId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: trip.status,
          reason: trip.reason
        })
      });
      const updatedTrip = await response.json();
      setTrips(trips.map(t => 
        t._id === tripId ? updatedTrip : t
      ));
    } catch (error) {
      console.error('Failed to submit decision:', error);
    }
  };  

  const handleNewTripSubmit = async () => {
    setIsSubmitting(true);
    try {
        // First create the trip
        const tripResponse = await fetch('${API_URL}/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tripName: tripDetails.tripName,
                employeeName: tripDetails.employeeName,
                dateRange: tripDetails.dateRange,
                userEmail: user.username,
                totalAmount
            })
        });
  
        const newTrip = await tripResponse.json();
  
        // Then create expenses for the new trip
        const expensePromises = receipts.map(receipt => {
            return fetch(`${API_URL}/api/trips/${newTrip._id}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: receipt.amount,
                    date: receipt.date,
                    vendor: receipt.vendor,
                    receipt: receipt.receipt
                })
            }).then(res => res.json());
        });
  
        await Promise.all(expensePromises);
  
        setExpenseView('list');
        fetchTrips();
    } catch (error) {
        console.error('Error creating new trip:', error);
    } finally {
        setIsSubmitting(false);
    }
  };
  


const handleSubmit = () => {
      handleNewTripSubmit();
  
};

const handleEditSubmit = async (tripId) => {
  setIsSubmitting(true);
  try {
    const updateData = {
      tripName: tripDetails.tripName,
      employeeName: tripDetails.employeeName,
      dateRange: tripDetails.dateRange,
      userEmail: user.username,
      totalAmount,
      expenses: receipts.map(receipt => ({
        vendor: receipt.vendor,
        amount: Number(receipt.amount),
        date: receipt.date,
        comments: receipt.comments || '',
        receipt: receipt.receipt,
        tripId: tripId
      }))
    };
    
    console.log('Sending exact data:', JSON.stringify(updateData, null, 2));

    const response = await fetch(`${API_URL}/api/trips/${tripId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Update failed');
    }

    const updatedTrip = await response.json();
    console.log('Success! Updated trip:', updatedTrip);
    
    fetchTrips();
    setExpenseView('list');
  } catch (error) {
    console.error('Detailed error:', error);
  } finally {
    setIsSubmitting(false);
  }
};


  return (
    <div className="expense-manager">
      <div className="header">
        <h1>Expense Reports</h1>
        <div className="actions">
          <button onClick={onBack}>Home Page</button>
          <button onClick={() => {
            setExpenseView(expenseView === 'list' ? 'new' : 'list');
            setTripDetails({
              tripName: '',
              employeeName: '',
              dateRange: { start: '', end: '' }
            });
            setExpenseDetails({
              vendor: '',
              amount: '',
              date: '',
              comments: '',
              receipt: null
            });
            setReceipts([]);
            setTotalAmount(0);
          }}>
            {expenseView === 'list' ? 'New Report' : 'View Reports'}
          </button>
          {ADMIN_EMAILS.includes(user?.username) && (
            <button
              className="approve-deny-btn"
              onClick={() => setExpenseView('approve')}
            >
              Approve/Deny Reports
            </button>
          )}
        </div>
      </div>

      {expenseView === 'list' ? (
        <div className="trips-list">
          <div className="filters-container">
            <div className="filter-group">
              <input
                type="date"
                placeholder="Start Date"
                value={filters.dateStart}
                onChange={(e) => setFilters({...filters, dateStart: e.target.value})}
              />
              <input
                type="date"
                placeholder="End Date"
                value={filters.dateEnd}
                onChange={(e) => setFilters({...filters, dateEnd: e.target.value})}
              />
            </div>

            <div className="filter-group">
              <button 
                onClick={() => setFilters({
                  ...filters, 
                  sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
                })}
                className={`sort-button ${filters.sortOrder}`}
              >
                Amount {filters.sortOrder === 'asc' ? '↑' : '↓'}
              </button>
              <button
                onClick={() => setFilters({...filters, sortOrder: 'none'})}
                className="sort-button"
              >
                Clear Sort
              </button>
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </select>

            <input
              type="text"
              placeholder="Search by trip or employee name"
              value={filters.searchTerm}
              onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
            />
              <button 
                className="clear-filters-btn"
                onClick={() => setFilters({
                  dateStart: '',
                  dateEnd: '',
                  status: 'all',
                  searchTerm: '',
                  sortOrder: 'none'
                })}
              >
                Clear All Filters
              </button>
          </div>
          {applyFilters(trips).map(trip => (
            <div key={trip._id} className="trip-card">
                      <div className="trip-header">
                        <h3>{trip.tripName}</h3>
                        <button 
                          className="edit-button"
                          onClick={() => {
                            // Load trip data into state
                            setTripDetails({
                              _id: trip._id,
                              tripName: trip.tripName,
                              employeeName: trip.employeeName,
                              dateRange: trip.dateRange,
                              userEmail: user.username
                            });
                            // Load expenses
                            setReceipts(trip.expenses);
                            // Set total amount
                            setTotalAmount(trip.totalAmount);
                            setExpenseDetails({
                              vendor: '',
                              amount: '',
                              date: '',
                              comments: '',
                              receipt: null
                            });
                            // Switch to edit view
                            setExpenseView('edit');
                          }}
                        >
                          Edit Report
                        </button>
                      </div>
              <p>Employee: {trip.employeeName}</p>
              <p>${trip.totalAmount.toFixed(2)}</p>
              <p>Date Range: {
                new Date(trip.dateRange.start).toLocaleDateString('en-US', { timeZone: 'UTC' })
              } - {
                new Date(trip.dateRange.end).toLocaleDateString('en-US', { timeZone: 'UTC' })
              }</p>
              <div className={`status-badge ${trip.status}`}>{trip.status}</div>
              {trip.reason && <p className="status-reason">Reason: {trip.reason}</p>}
              <button onClick={() => setExpandedTrip(expandedTrip === trip._id ? null : trip._id)}>
                {expandedTrip === trip._id ? 'Hide Details' : 'Show Details'}
              </button>
              {expandedTrip === trip._id && (
                <div className="trip-details">
                  {trip.expenses?.map((expense, index) => (
                    <div key={index} className="expense-item">
                      <img src={expense.receipt} alt="Receipt" />
                      <div>
                      <p>Vendor: {expense.vendor}</p>
                      <p>Amount: ${expense.amount.toFixed(2)}</p>
                      <p>Date: {new Date(expense.date).toLocaleDateString()}</p>
                      <p>Comments: {expense.comments}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
      ) : expenseView === 'add-expense' ? (
        <div className="add-expense-container">
          <div className="expense-form">
            <input
              type="text"
              placeholder="Vendor Name"
              value={expenseDetails.vendor}
              onChange={(e) => setExpenseDetails({...expenseDetails, vendor: e.target.value})}
            />
            <input
              type="number"
              placeholder="Amount"
              value={expenseDetails.amount}
              onChange={(e) => setExpenseDetails({...expenseDetails, amount: e.target.value})}
            />
            <input
              type="date"
              value={expenseDetails.date}
              onChange={(e) => setExpenseDetails({...expenseDetails, date: e.target.value})}
            />
            <textarea
              placeholder="Comments"
              value={expenseDetails.comments}
              onChange={(e) => setExpenseDetails({...expenseDetails, comments: e.target.value})}
            />
            <div className="receipt-upload">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => handleReceiptUpload(e.target.files[0])}
              />
              {expenseDetails.receipt && (
                <img src={expenseDetails.receipt} alt="Receipt Preview" className="receipt-preview" />
              )}
            </div>
            <div className="button-group">
              <button onClick={() => handleExpenseSubmit(false)}
                disabled={!expenseDetails.vendor || 
                  !expenseDetails.amount || 
                  !expenseDetails.date || 
                  !expenseDetails.receipt}
                >Submit</button>
              <button onClick={() => handleExpenseSubmit(true)}
                disabled={!expenseDetails.vendor || 
                  !expenseDetails.amount || 
                  !expenseDetails.date || 
                  !expenseDetails.receipt}
                >Submit & Add Another Expense</button>
              <button onClick={() => setExpenseView('new')} style={{background: '#ff4444'}}>Cancel</button>
            </div>
          </div>
        </div>

      ) : expenseView === 'approve' ? (
        <div className="approval-screen">
          {applyFilters(trips).map(trip => (
            <div key={trip._id} className="approval-card">
              <h3>{trip.tripName}</h3>
              <p>Employee: {trip.employeeName}</p>
              <p>Date Range: {new Date(trip.dateRange.start).toLocaleDateString()} - {new Date(trip.dateRange.end).toLocaleDateString()}</p>
              <p>${trip.totalAmount.toFixed(2)}</p>
              
              <div className="approval-actions">
                <select
                  value={trip.status}
                  onChange={(e) => handleStatusChange(trip._id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied</option>
                </select>
                <textarea
                  placeholder="Reason for decision (required)..."
                  value={trip.reason || ''}
                  onChange={(e) => handleReasonChange(trip._id, e.target.value)}
                />
                
                <button 
                  className="submit-decision"
                  disabled={trip.status === 'pending' || !trip.reason}
                  onClick={() => handleSubmitDecision(trip._id)}
                >
                  Submit Decision
                </button>
              </div>
            </div>
          ))}
        </div>

) : expenseView === 'edit' ? (
  <div className="edit-trip-container">
    <div className="fixed-section">
      <input
        type="text"
        placeholder="Trip Name"
        value={tripDetails.tripName}
        onChange={(e) => setTripDetails({...tripDetails, tripName: e.target.value})}
      />
      <input
        type="text"
        placeholder="Employee Name"
        value={tripDetails.employeeName}
        onChange={(e) => setTripDetails({...tripDetails, employeeName: e.target.value})}
      />
      <div className="date-inputs">
        <input
          type="date"
          value={tripDetails.dateRange.start.split('T')[0]}
          onChange={(e) => setTripDetails({
            ...tripDetails,
            dateRange: {...tripDetails.dateRange, start: e.target.value}
          })}
        />
        <input
          type="date"
          value={tripDetails.dateRange.end.split('T')[0]}
          onChange={(e) => setTripDetails({
            ...tripDetails,
            dateRange: {...tripDetails.dateRange, end: e.target.value}
          })}
        />
      </div>
      
      <div className="receipt-section">
        <div className="expense-form">
          <input
            type="text"
            placeholder="Vendor Name"
            value={expenseDetails.vendor}
            onChange={(e) => setExpenseDetails({...expenseDetails, vendor: e.target.value})}
          />
          <input
            type="number"
            placeholder="Amount"
            value={expenseDetails.amount}
            onChange={(e) => setExpenseDetails({...expenseDetails, amount: e.target.value})}
          />
          <input
            type="date"
            value={expenseDetails.date}
            onChange={(e) => setExpenseDetails({...expenseDetails, date: e.target.value})}
          />
          <textarea
            placeholder="Comments"
            value={expenseDetails.comments}
            onChange={(e) => setExpenseDetails({...expenseDetails, comments: e.target.value})}
          />
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => handleReceiptUpload(e.target.files[0])}
            className="receipt-input"
          />
          {expenseDetails.receipt && (
            <img src={expenseDetails.receipt} alt="Receipt Preview" className="receipt-preview" />
          )}
          <button 
            onClick={() => {
              setReceipts([...receipts, expenseDetails]);
              setTotalAmount(prev => prev + Number(expenseDetails.amount));
              setExpenseDetails({
                vendor: '',
                amount: '',
                date: '',
                comments: '',
                receipt: null
              });
              const fileInput = document.querySelector('.receipt-input');
              if (fileInput) {
                fileInput.value = '';
              }
            }}
          >
            Add Expense
          </button>
        </div>
      </div>

      <div className="receipts-grid">
        {receipts.map((receipt, index) => (
          <div key={index} className="receipt-card">
            <img src={receipt.receipt} alt="Receipt" className="receipt-thumbnail" />
            <div className="receipt-details">
              <p>Amount: ${receipt.amount}</p>
              <p>Date: {new Date(receipt.date).toLocaleDateString()}</p>
              <p>Vendor: {receipt.vendor}</p>
              <button 
                onClick={() => {
                  setTotalAmount(prev => prev - receipts[index].amount);
                  setReceipts(prev => prev.filter((_, i) => i !== index));
                }}
                className="remove-receipt"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="total">Total: ${totalAmount.toFixed(2)}</p>

      <div className="edit-actions">
        <button 
          className="cancel-edit"
          onClick={() => setExpenseView('list')}
        >
          Cancel
        </button>
        <button
          className="save-changes"
          onClick={() => handleEditSubmit(tripDetails._id)}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </div>
    </div>
  </div>

        
      ) : (
        <div className="create-trip-container">
          <div className="fixed-section">
            <input
              type="text"
              placeholder="Trip Name"
              value={tripDetails.tripName}
              onChange={(e) => setTripDetails({...tripDetails, tripName: e.target.value})}
            />
            <input
              type="text"
              placeholder="Employee Name"
              value={tripDetails.employeeName}
              onChange={(e) => setTripDetails({...tripDetails, employeeName: e.target.value})}
            />
            <div className="date-inputs">
              <input
                type="date"
                value={tripDetails.dateRange.start}
                onChange={(e) => setTripDetails({
                  ...tripDetails,
                  dateRange: {...tripDetails.dateRange, start: e.target.value}
                })}
              />
              <input
                type="date"
                value={tripDetails.dateRange.end}
                onChange={(e) => setTripDetails({
                  ...tripDetails,
                  dateRange: {...tripDetails.dateRange, end: e.target.value}
                })}
              />
            </div>
            <p className="total">Total: ${totalAmount.toFixed(2)}</p>
          </div>

          <div className="scrollable-section">
            <button
              className="add-expense-btn"
              onClick={() => {
                setExpenseDetails({
                  vendor: '',
                  amount: '',
                  date: '',
                  comments: '',
                  receipt: null
                });
                setExpenseView('add-expense');
              }}
            >
              Add Expense
            </button>

            <div className="expenses-box">
              {receipts.map((receipt, index) => (
                <div key={index} className="expense-item">
                  <img src={receipt.receipt} alt="Receipt" />
                  <div className="expense-details">
                    <p>Vendor: {receipt.vendor}</p>
                    <p>Amount: ${receipt.amount.toFixed(2)}</p>
                    <p>Date: {new Date(receipt.date).toLocaleDateString()}</p>
                    <p>Comments: {receipt.comments}</p>
                    <button
                      onClick={() => {
                        setTotalAmount(prev => prev - receipt.amount);
                        setReceipts(prev => prev.filter((_, i) => i !== index));
                      }}
                      style={{
                        background: '#ff4444',
                        color: 'white',
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
              className="submit-trip"
              onClick={handleSubmit}
              disabled={
                  !tripDetails.tripName ||
                  !tripDetails.employeeName ||
                  !tripDetails.dateRange.start ||
                  !tripDetails.dateRange.end ||
                  receipts.length === 0 ||
                  isSubmitting
              }
              style={{
                  backgroundColor: (!tripDetails.tripName ||
                      !tripDetails.employeeName ||
                      !tripDetails.dateRange.start ||
                      !tripDetails.dateRange.end ||
                      receipts.length === 0 ||
                      isSubmitting) ? '#cccccc' : '#0066cc',
                  cursor: (!tripDetails.tripName ||
                      !tripDetails.employeeName ||
                      !tripDetails.dateRange.start ||
                      !tripDetails.dateRange.end ||
                      receipts.length === 0 ||
                      isSubmitting) ? 'not-allowed' : 'pointer'
              }}
          >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>

        </div>
      )}
    </div>
  );
}

export default ExpenseManager;
