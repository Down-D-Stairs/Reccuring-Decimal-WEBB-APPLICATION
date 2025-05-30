import React, { useState, useEffect, useMemo } from 'react';
import './Login.css';

function ExpenseManager({ onBack, user }) {
  const [trips, setTrips] = useState([]);
  const [expenseView, setExpenseView] = useState('list');
  const [expandedTrip, setExpandedTrip] = useState(null);
  const [selectedTrips, setSelectedTrips] = useState([]);
  
  // Add these state variables at the top with your other state variables
  const [currentPage, setCurrentPage] = useState(1);
  const [reportsPerPage] = useState(2); // You can adjust this number

  // Add this state for edit mode pagination
  const [editReceiptPage, setEditReceiptPage] = useState(1);
  const receiptsPerPage = 1; // One receipt per page

  // Add this function to get paginated receipts for edit mode
  const getPaginatedEditReceipts = () => {
    const startIndex = (editReceiptPage - 1) * receiptsPerPage;
    const endIndex = startIndex + receiptsPerPage;
    return receipts.slice(startIndex, endIndex);
  };
  
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
    dateRange: { start: '', end: '' }
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
 
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchTrips = async () => {
    try {
      console.log('Current user:', user.username);
      console.log('Is admin?', ADMIN_EMAILS.includes(user.username));
       
      const response = await fetch(`${API_URL}/api/trips?email=${user.username}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trips');
      }
      const data = await response.json();
      console.log('All trips from server:', data);
       
      const filteredTrips = ADMIN_EMAILS.includes(user.username)
        ? data
        : data.filter(trip => trip.email === user.username);
       
      console.log('Filtered trips:', filteredTrips);
      setTrips(filteredTrips); // Keep only this setTrips call
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
        trip.email.toLowerCase().includes(filters.searchTerm.toLowerCase());
     
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

  // Add this function with your other functions
  const getPaginatedReports = (filteredReports) => {
    const indexOfLastReport = currentPage * reportsPerPage;
    const indexOfFirstReport = indexOfLastReport - reportsPerPage;
    return filteredReports.slice(indexOfFirstReport, indexOfLastReport);
  };

  // Calculate total pages using useMemo to avoid initialization issues
  const totalPages = useMemo(() => {
    return Math.ceil(applyFilters(trips).length / reportsPerPage);
  }, [trips, filters, reportsPerPage]);

  // Update your filter handlers to reset to page 1 when filters change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    
    // If it's a search, try to find the first matching result
    if (newFilters.searchTerm && newFilters.searchTerm !== filters.searchTerm) {
      // Apply the new filters to get filtered results
      const filteredResults = applyFiltersWithParams(trips, newFilters);
      
      if (filteredResults.length > 0) {
        // Calculate which page the first result would be on
        const firstResultPage = Math.ceil(1 / reportsPerPage);
        setCurrentPage(firstResultPage);
      } else {
        setCurrentPage(1);
      }
    } else {
      setCurrentPage(1); // Reset to page 1 for other filter changes
    }
  };

  // Helper function to apply filters with custom parameters
  const applyFiltersWithParams = (trips, filterParams) => {
    let filteredTrips = trips.filter(trip => {
      const matchesDate = (!filterParams.dateStart || new Date(trip.dateRange.start) >= new Date(filterParams.dateStart)) &&
        (!filterParams.dateEnd || new Date(trip.dateRange.end) <= new Date(filterParams.dateEnd));
     
      const matchesStatus = filterParams.status === 'all' || trip.status === filterParams.status;
     
      const matchesSearch = !filterParams.searchTerm ||
        trip.tripName.toLowerCase().includes(filterParams.searchTerm.toLowerCase()) ||
        (trip.employeeName && trip.employeeName.toLowerCase().includes(filterParams.searchTerm.toLowerCase()));
     
      return matchesDate && matchesStatus && matchesSearch;
    });

    if (filterParams.sortOrder !== 'none') {
      filteredTrips.sort((a, b) => {
        if (filterParams.sortOrder === 'asc') {
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
      // Check if we're editing or creating new
      if (tripDetails._id) {
        setExpenseView('edit'); // Return to edit view if we have an ID
      } else {
        setExpenseView('new'); // Return to new view if creating
      }
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
    
    // Simple confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to ${trip.status} this report?`
    );
    
    if (!confirmed) return;
    
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
      
      // Redirect to view reports
      setExpenseView('list');
      
    } catch (error) {
      console.error('Failed to submit decision:', error);
    }
  };

  const handleSubmitBatchDecisions = async () => {
    // Simple confirmation dialog for batch decisions
    const confirmed = window.confirm(
      `Are you sure you want to submit decisions for ${selectedTrips.length} selected reports?`
    );
    
    if (!confirmed) return;
    
    try {
      // Create an array of promises for each selected trip
      const updatePromises = selectedTrips.map(tripId => {
        const trip = trips.find(t => t._id === tripId);
        return fetch(`${API_URL}/api/trips/${tripId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: trip.status,
            reason: trip.reason
          })
        });
      });
      
      // Wait for all promises to resolve
      await Promise.all(updatePromises);
      
      // Fetch updated trips
      await fetchTrips();
      
      // Clear selections and redirect to list view
      setSelectedTrips([]);
      setExpenseView('list');
      
    } catch (error) {
      console.error('Failed to submit decisions:', error);
    }
  };
  const handleNewTripSubmit = async () => {
    try {
      // First create the trip
      const tripResponse = await fetch(`${API_URL}/api/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripName: tripDetails.tripName,
          dateRange: tripDetails.dateRange,
          email: user.username,
          totalAmount
        })
      });

      const newTrip = await tripResponse.text();
      const trip = JSON.parse(newTrip);

      // Now add each expense
      for (const receipt of receipts) {
        await fetch(`${API_URL}/api/trips/${trip._id}/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: receipt.amount,
            date: receipt.date,
            vendor: receipt.vendor,
            receipt: receipt.receipt
          })
        });
      }

      setExpenseView('list');
      fetchTrips();
    } catch (error) {
      console.error('Error:', error);
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
        dateRange: tripDetails.dateRange,
        email: user.username,
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
        <div className="trips-list-table">
          <div className="filters-container">
            <div className="filter-group">
              <input
                type="date"
                placeholder="Start Date"
                value={filters.dateStart}
                onChange={(e) => handleFilterChange({...filters, dateStart: e.target.value})}
              />
              <input
                type="date"
                placeholder="End Date"
                value={filters.dateEnd}
                onChange={(e) => handleFilterChange({...filters, dateEnd: e.target.value})}
              />
            </div>

            <div className="filter-group">
              <button 
                onClick={() => handleFilterChange({
                  ...filters, 
                  sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
                })}
                className={`sort-button ${filters.sortOrder}`}
              >
                Amount {filters.sortOrder === 'asc' ? '↑' : '↓'}
              </button>
              <button
                onClick={() => handleFilterChange({...filters, sortOrder: 'none'})}
                className="sort-button"
              >
                Clear Sort
              </button>
            </div>

            <select
              value={filters.status}
              onChange={(e) => handleFilterChange({...filters, status: e.target.value})}
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
              onChange={(e) => handleFilterChange({...filters, searchTerm: e.target.value})}
            />
            
            <button 
              className="clear-filters-btn"
              onClick={() => {
                handleFilterChange({
                  dateStart: '',
                  dateEnd: '',
                  status: 'all',
                  searchTerm: '',
                  sortOrder: 'none'
                });
              }}
            >
              Clear All Filters
            </button>
          </div>

          <div className="reports-table-container">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Report Name</th>
                  <th>Employee Name</th>
                  <th>Total Amount</th>
                  <th>Date Range</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedReports(applyFilters(trips)).map(trip => (
                  <React.Fragment key={trip._id}>
                    <tr className="report-row">
                      <td className="report-name">{trip.tripName}</td>
                      <td>{trip.employeeName}</td>
                      <td className="amount">${trip.totalAmount.toFixed(2)}</td>
                      <td className="date-range">
                        {new Date(trip.dateRange.start).toLocaleDateString('en-US', { timeZone: 'UTC' })} - {new Date(trip.dateRange.end).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                      </td>
                      <td>
                        <span className={`status-badge ${trip.status}`}>{trip.status}</span>
                        {trip.reason && <div className="status-reason">Reason: {trip.reason}</div>}
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="edit-button"
                          onClick={() => {
                            setTripDetails({
                              _id: trip._id,
                              tripName: trip.tripName,
                              employeeName: trip.employeeName,
                              dateRange: trip.dateRange,
                              userEmail: user.username
                            });
                            setReceipts(trip.expenses);
                            setTotalAmount(trip.totalAmount);
                            setExpenseDetails({
                              vendor: '',
                              amount: '',
                              date: '',
                              comments: '',
                              receipt: null
                            });
                            setExpenseView('edit');
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          className="details-button"
                          onClick={() => setExpandedTrip(expandedTrip === trip._id ? null : trip._id)}
                        >
                          {expandedTrip === trip._id ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    
                    {expandedTrip === trip._id && (
                      <tr className="expanded-row">
                        <td colSpan="6">
                          <div className="trip-details-expanded">
                            <h4>Expense Details</h4>
                            <div className="expenses-grid">
                              {trip.expenses?.map((expense, index) => (
                                <div key={index} className="expense-detail-card">
                                  <img src={expense.receipt} alt="Receipt" className="receipt-image" />
                                  <div className="expense-info">
                                    <p><strong>Vendor:</strong> {expense.vendor}</p>
                                    <p><strong>Amount:</strong> ${expense.amount.toFixed(2)}</p>
                                    <p><strong>Date:</strong> {new Date(expense.date).toLocaleDateString()}</p>
                                    {expense.comments && <p><strong>Comments:</strong> {expense.comments}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            
            {applyFilters(trips).length === 0 && (
              <div className="no-reports">
                <p>No reports found matching your criteria.</p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="pagination-container">
            <div className="pagination-info">
              Showing {Math.min((currentPage - 1) * reportsPerPage + 1, applyFilters(trips).length)} to {Math.min(currentPage * reportsPerPage, applyFilters(trips).length)} of {applyFilters(trips).length} reports
            </div>
            
            <div className="pagination-controls">
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </button>
              
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
              
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </button>
            </div>
          </div>
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
              <div className="approval-header">
                <input
                  type="checkbox"
                  checked={selectedTrips.includes(trip._id)}
                  onChange={() => {
                    if (selectedTrips.includes(trip._id)) {
                      setSelectedTrips(selectedTriips.filter(id => id !== trip._id));
                    } else {
                      setSelectedTrips([...selectedTrips, trip._id]);
                    }
                  }}
                />
                <h3>{trip.tripName}</h3>
              </div>
              <p>Email: {trip.email || user.username}</p>
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
          <div className="batch-approval-actions">
            <button
              className="submit-all-decisions"
              disabled={selectedTrips.length === 0 ||
                selectedTrips.some(id => {
                  const trip = trips.find(t => t._id === id);
                  return trip.status === 'pending' || !trip.reason;
                })}
              onClick={handleSubmitBatchDecisions}
            >
              Submit Selected Decisions ({selectedTrips.length})
            </button>
          </div>
        </div>

      ) : expenseView === 'edit' ? (
        <div className="edit-report-container">
          {/* Horizontal Form Header */}
          <div className="edit-form-header">
            <input
              type="text"
              placeholder="Report Name"
              value={tripDetails.tripName}
              onChange={(e) => setTripDetails({
                ...tripDetails,
                tripName: e.target.value
              })}
              className="edit-report-name"
            />
            
            <input
              type="date"
              value={tripDetails.dateRange.start}
              onChange={(e) => setTripDetails({
                ...tripDetails,
                dateRange: { ...tripDetails.dateRange, start: e.target.value }
              })}
              className="edit-date-input"
            />
            
            <input
              type="date"
              value={tripDetails.dateRange.end}
              onChange={(e) => setTripDetails({
                ...tripDetails,
                dateRange: { ...tripDetails.dateRange, end: e.target.value }
              })}
              className="edit-date-input"
            />
            
            <button 
              className="add-receipt-btn"
              onClick={() => setExpenseView('add-expense')}
            >
              + Add Receipt
            </button>
          </div>

          {/* Receipts Table with Pagination */}
          <div className="edit-receipts-section">
            {receipts.length > 0 ? (
              <>
                <table className="edit-receipts-table">
                  <thead>
                    <tr>
                      <th>Receipt Image</th>
                      <th>Vendor</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Comments</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedEditReceipts().map((receipt, index) => {
                      const actualIndex = (editReceiptPage - 1) * receiptsPerPage + index;
                      return (
                        <tr key={actualIndex} className="edit-receipt-row">
                          <td className="receipt-image-cell">
                            <img 
                              src={receipt.receipt} 
                              alt="Receipt" 
                              className="edit-receipt-image"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={receipt.vendor}
                              onChange={(e) => {
                                const updatedReceipts = [...receipts];
                                updatedReceipts[actualIndex].vendor = e.target.value;
                                setReceipts(updatedReceipts);
                              }}
                              className="edit-vendor-input"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={receipt.amount}
                              onChange={(e) => {
                                const updatedReceipts = [...receipts];
                                const oldAmount = updatedReceipts[actualIndex].amount;
                                const newAmount = parseFloat(e.target.value) || 0;
                                updatedReceipts[actualIndex].amount = newAmount;
                                setReceipts(updatedReceipts);
                                setTotalAmount(prev => prev - oldAmount + newAmount);
                              }}
                              className="edit-amount-input"
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              value={receipt.date}
                              onChange={(e) => {
                                const updatedReceipts = [...receipts];
                                updatedReceipts[actualIndex].date = e.target.value;
                                setReceipts(updatedReceipts);
                              }}
                              className="edit-date-input"
                            />
                          </td>
                          <td>
                            <textarea
                              value={receipt.comments || ''}
                              onChange={(e) => {
                                const updatedReceipts = [...receipts];
                                updatedReceipts[actualIndex].comments = e.target.value;
                                setReceipts(updatedReceipts);
                              }}
                              className="edit-comments-textarea"
                              rows="2"
                              placeholder="Add comments..."
                            />
                          </td>
                          <td>
                            <button
                              onClick={() => {
                                setTotalAmount(prev => prev - receipt.amount);
                                setReceipts(prev => prev.filter((_, i) => i !== actualIndex));
                                // Adjust page if we removed the last receipt on this page
                                if (receipts.length <= editReceiptPage * receiptsPerPage - receiptsPerPage + 1 && editReceiptPage > 1) {
                                  setEditReceiptPage(editReceiptPage - 1);
                                }
                              }}
                              className="remove-receipt-btn"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Receipt Pagination */}
                {receipts.length > receiptsPerPage && (
                  <div className="edit-pagination">
                    <button
                      onClick={() => setEditReceiptPage(prev => Math.max(prev - 1, 1))}
                      disabled={editReceiptPage === 1}
                      className="pagination-btn"
                    >
                      ← Previous
                    </button>
                    
                    <span className="pagination-info">
                      Receipt {editReceiptPage} of {receipts.length}
                    </span>
                    
                    <button
                      onClick={() => setEditReceiptPage(prev => Math.min(prev + 1, receipts.length))}
                      disabled={editReceiptPage === receipts.length}
                      className="pagination-btn"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="no-receipts">
                <p>No receipts added yet. Click "Add Receipt" to get started.</p>
              </div>
            )}
          </div>

          {/* Total and Actions */}
          <div className="edit-footer">
            <div className="edit-total">
              Total: ${totalAmount.toFixed(2)}
            </div>
            
            <div className="edit-actions">
              <button 
                className="cancel-edit-btn"
                onClick={() => setExpenseView('list')}
              >
                Cancel
              </button>
              <button 
                className="save-changes-btn"
                onClick={handleEditSubmit}
                disabled={!tripDetails.tripName || receipts.length === 0}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
       
      ) : (
        <div className="create-trip-container">
          <div className="fixed-section">
            <div className="form-field">
              <label className="field-label">Report Name</label>
              <input
                type="text"
                placeholder="Enter Report Name"
                value={tripDetails.tripName}
                onChange={(e) => setTripDetails({...tripDetails, tripName: e.target.value})}
                className="trip-name-input"
              />
            </div>

            
            
            <div className="form-field">
              <label className="field-label">Date Range</label>
              <div className="date-inputs">
                <div className="date-field">
                  <label className="date-label">Start</label>
                  <input
                    type="date"
                    value={tripDetails.dateRange.start}
                    onChange={(e) => setTripDetails({
                      ...tripDetails,
                      dateRange: {...tripDetails.dateRange, start: e.target.value}
                    })}
                  />
                </div>
                
                <div className="date-field">
                  <label className="date-label">End</label>
                  <input
                    type="date"
                    value={tripDetails.dateRange.end}
                    onChange={(e) => setTripDetails({
                      ...tripDetails,
                      dateRange: {...tripDetails.dateRange, end: e.target.value}
                    })}
                  />
                </div>
              </div>
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
                  !tripDetails.dateRange.start ||
                  !tripDetails.dateRange.end ||
                  receipts.length === 0 ||
                  isSubmitting
              }
              style={{
                  backgroundColor: (!tripDetails.tripName ||
                      !tripDetails.dateRange.start ||
                      !tripDetails.dateRange.end ||
                      receipts.length === 0 ||
                      isSubmitting) ? '#cccccc' : '#0066cc',
                  cursor: (!tripDetails.tripName ||
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
