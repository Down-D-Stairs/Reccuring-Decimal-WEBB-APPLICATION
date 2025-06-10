import React, { useState, useEffect, useMemo } from 'react';
import './Login.css';

function ExpenseManager({ onBack, user }) {
  const [trips, setTrips] = useState([]);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const [expenseView, setExpenseView] = useState('list');
  const [expandedTrip, setExpandedTrip] = useState(null);
  const [selectedTrips, setSelectedTrips] = useState([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);


  
  // Add these state variables at the top with your other state variables
  const [currentPage, setCurrentPage] = useState(1);
  const [reportsPerPage] = useState(2); // You can adjust this number
  
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false); // Add this state

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
    projectName: '',
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
    checkForDraft();
    fetchProjects(); // ADD THIS LINE
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

// Add this simple function
const fetchProjects = async () => {
  try {
    const response = await fetch(`${API_URL}/api/user-project-names?email=${user.username}`);
    const projectNames = await response.json();
    setProjects(projectNames);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
  }
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
  setIsProcessingReceipt(true); // Start loading
  
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
  } finally {
    setIsProcessingReceipt(false); // End loading
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

  // Add this function to handle adding expense in edit mode
  const handleAddExpenseInEdit = () => {
    if (expenseDetails.vendor && expenseDetails.amount && expenseDetails.date && expenseDetails.receipt) {
      setReceipts(prev => [...prev, expenseDetails]);
      setTotalAmount(prev => prev + Number(expenseDetails.amount));
      
      // Reset form
      setExpenseDetails({
        vendor: '',
        amount: '',
        date: '',
        comments: '',
        receipt: null
      });
      
      // Clear file input
      const fileInput = document.querySelector('.receipt-input');
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Hide the form
      setShowAddExpenseForm(false);
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
          projectName: tripDetails.projectName,
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

    // Delete the draft after successful submission
    try {
      await fetch(`${API_URL}/api/drafts/${user.username}`, {
        method: 'DELETE'
      });
      setHasDraft(false);
    } catch (draftError) {
      console.log('No draft to delete or error deleting draft');
    }

      setExpenseView('list');
      fetchTrips();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async () => {
    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to submit this expense report?\n\n` +
      `Report Name: ${tripDetails.tripName}\n` +
      `Total Amount: $${totalAmount.toFixed(2)}\n` +
      `Number of Expenses: ${receipts.length}\n\n` 
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    
    try {
      await handleNewTripSubmit();
    
      // Reset form after successful submission
      setTripDetails({ tripName: '', dateRange: { start: '', end: '' } });
      setReceipts([]);
      setTotalAmount(0);
      setExpenseDetails({
        vendor: '',
        amount: '',
        date: '',
        comments: '',
        receipt: null
      });

      // Success message
      alert(`✅ Report "${tripDetails.tripName}" submitted successfully!\nTotal: $${totalAmount.toFixed(2)}`);
      
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('❌ Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleEditSubmit = async (tripId) => {
    setIsSubmitting(true);
    try {
      const updateData = {
        tripName: tripDetails.tripName,
        projectName: tripDetails.projectName, // ADD THIS LINE
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

  const checkForDraft = async () => {
    try {
      const response = await fetch(`${API_URL}/api/drafts/${user.username}`);
      if (response.ok) {
        setHasDraft(true);
      } else {
        setHasDraft(false);
      }
    } catch (error) {
      console.error('Error checking for draft:', error);
      setHasDraft(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const draftData = {
        tripName: tripDetails.tripName,
        projectName: tripDetails.projectName,
        dateRange: tripDetails.dateRange,
        email: user.username,
        totalAmount,
        expenses: receipts
      };

      const response = await fetch(`${API_URL}/api/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData)
      });

      if (!response.ok) {
        throw new Error('Failed to save draft');
      }

      setHasDraft(true);
      alert('Draft saved successfully!');
      setExpenseView('list');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft');
    }
  };
  const handleLoadDraft = async () => {
    try {
      const response = await fetch(`${API_URL}/api/drafts/${user.username}`);
      
      if (!response.ok) {
        throw new Error('No draft found');
      }
      
      const draft = await response.json();
      
      setTripDetails({
        tripName: draft.tripName,
        projectName: draft.projectName || '',
        dateRange: {
          start: draft.dateRange.start,
          end: draft.dateRange.end
        }
      });
      setReceipts(draft.expenses || []);
      setTotalAmount(draft.totalAmount || 0);
      setExpenseView('new');
    } catch (error) {
      console.error('Error loading draft:', error);
      alert('Failed to load draft');
    }
  };
  const downloadReceipt = (expense) => {
    const link = document.createElement('a');
    link.href = expense.receipt;
    
    // Format: Receipt_VendorName_Date.jpg
    const date = new Date(expense.date).toISOString().split('T')[0]; // YYYY-MM-DD
    const vendorName = expense.vendor.replace(/[^a-zA-Z0-9]/g, '_'); // Replace special chars
    link.download = `Receipt_${vendorName}_${date}.jpg`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              placeholder="Search by report or employee name"
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
                      <td>{trip.email}</td>
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
                              projectName: trip.projectName || '',
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
                            
                            {/* Show project name first, prominently */}
                            {trip.projectName && (
                              <div className="project-info">
                                <h4>Project: {trip.projectName}</h4>
                              </div>
                            )}

                            <h4>Expense Details</h4>
                            <div className="expenses-list">
                              {trip.expenses?.map((expense, index) => (
                                <div 
                                  key={index} 
                                  className="expense-item clickable"
                                  onClick={() => {
                                    setSelectedExpense({...expense, tripProjectName: trip.projectName});
                                    setIsExpenseModalOpen(true);
                                  }}
                                >
                                  <img src={expense.receipt} alt="Receipt" className="receipt-thumbnail" />
                                  <div className="expense-details">
                                    <p>Amount: ${expense.amount.toFixed(2)}</p>
                                    <p>Date: {new Date(expense.date).toLocaleDateString()}</p>
                                    <p>Vendor: {expense.vendor}</p>
                                  </div>
                                  <span className="click-to-view">Click to view details</span>
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
                disabled={isProcessingReceipt}
              />
              {isProcessingReceipt && <span className="processing-text">Processing receipt...
              </span>}
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
        <div className="approval-table-view">
          {/* Filters Section */}
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
              placeholder="Search by report or employee name"
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

          {/* Approval Table */}
          <div className="approval-table-container">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTrips(getPaginatedReports(applyFilters(trips)).map(trip => trip._id));
                        } else {
                          setSelectedTrips([]);
                        }
                      }}
                      checked={selectedTrips.length === getPaginatedReports(applyFilters(trips)).length && getPaginatedReports(applyFilters(trips)).length > 0}
                    />
                  </th>
                  <th>Report Name</th>
                  <th>Employee Email</th>
                  <th>Total Amount</th>
                  <th>Date Range</th>
                  <th>Current Status</th>
                  <th>Decision</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedReports(applyFilters(trips)).map(trip => (
                  <React.Fragment key={trip._id}>
                    <tr className="approval-row">
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedTrips.includes(trip._id)}
                          onChange={() => {
                            if (selectedTrips.includes(trip._id)) {
                              setSelectedTrips(selectedTrips.filter(id => id !== trip._id));
                            } else {
                              setSelectedTrips([...selectedTrips, trip._id]);
                            }
                          }}
                        />
                      </td>
                      <td className="report-name">{trip.tripName}</td>
                      <td>{trip.email}</td>
                      <td className="amount">${trip.totalAmount.toFixed(2)}</td>
                      <td className="date-range">
                        {new Date(trip.dateRange.start).toLocaleDateString('en-US', { timeZone: 'UTC' })} - {new Date(trip.dateRange.end).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                      </td>
                      <td>
                        <span className={`status-badge ${trip.status}`}>{trip.status}</span>
                      </td>
                      <td>
                        <select
                          value={trip.status}
                          onChange={(e) => handleStatusChange(trip._id, e.target.value)}
                          className="decision-select"
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="denied">Denied</option>
                        </select>
                      </td>
                      <td>
                        <textarea
                          placeholder="Reason for decision..."
                          value={trip.reason || ''}
                          onChange={(e) => handleReasonChange(trip._id, e.target.value)}
                          className="reason-textarea"
                          rows="2"
                        />
                      </td>
                      <td className="actions-cell">
                        <button
                          className="submit-decision-btn"
                          disabled={trip.status === 'pending' || !trip.reason}
                          onClick={() => handleSubmitDecision(trip._id)}
                        >
                          Submit
                        </button>
                        <button
                          className="details-button"
                          onClick={() => setExpandedTrip(expandedTrip === trip._id ? null : trip._id)}
                        >
                          {expandedTrip === trip._id ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Details Row */}
                    {expandedTrip === trip._id && (
                      <tr className="expanded-row">
                        <td colSpan="9">
                          <div className="trip-details-expanded">
                            
                            {trip.projectName && (
                              <p style={{marginBottom: '15px'}}><strong>Project:</strong> {trip.projectName}</p>
                            )}

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

          {/* Batch Actions */}
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
        <div className="edit-trip-container">
          <div className="fixed-section">
            <input
              type="text"
              placeholder="Trip Name"
              value={tripDetails.tripName}
              onChange={(e) => setTripDetails({...tripDetails, tripName: e.target.value})}
              className="trip-name-input"
            />
            
            {/* ADD PROJECT DROPDOWN HERE */}
            <div className="form-field">
              <label className="field-label">Project (Optional)</label>
              <select
                value={tripDetails.projectName || ''}
                onChange={(e) => setTripDetails({
                  ...tripDetails,
                  projectName: e.target.value
                })}
                className="project-select"
              >
                <option value="">Select a project (optional)</option>
                {projects.map((projectName, index) => (
                  <option key={index} value={projectName}>
                    {projectName}
                  </option>
                ))}
              </select>
            </div>
            
            <p>Email: {user.username}</p>
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
                   
            <div className="receipts-section">
              <div className="receipts-header">
                <h3>Expenses</h3>
                <button
                  type="button"
                  onClick={() => setShowAddExpenseForm(true)}
                  className="add-expense-btn"
                >
                  + Add Expense
                </button>
              </div>
              
              {/* Display receipts in table format */}
              {receipts.length > 0 ? (
                <table className="receipts-table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Comments</th>
                      <th>Receipt</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt, index) => (
                      <tr key={index}>
                        <td>{receipt.vendor}</td>
                        <td>${receipt.amount}</td>
                        <td>{receipt.date}</td>
                        <td>{receipt.comments}</td>
                        <td>
                          {receipt.receipt && (
                            <img src={receipt.receipt} alt="Receipt" className="receipt-thumbnail" />
                          )}
                        </td>
                        <td>
                          <button 
                            onClick={() => {
                              setTotalAmount(prev => prev - receipts[index].amount);
                              setReceipts(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="remove-receipt-btn"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-expenses">No expenses added yet. Click "Add Expense" to get started.</p>
              )}
            </div>
            
            <p className="total">Total: ${totalAmount.toFixed(2)}</p>
            
            <div className="edit-actions">
              <button
                className="cancel-edit-btn"
                onClick={() => setExpenseView('list')}
              >
                Cancel
              </button>
              <button
                className="save-changes-btn"
                onClick={() => handleEditSubmit(tripDetails._id)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Pop-up form for adding expenses - same as new report view */}
          {showAddExpenseForm && (
            <div className="modal-overlay">
              <div className="add-expense-modal">
                <div className="modal-header">
                  <h3>Add New Expense</h3>
                  <button 
                    className="close-modal-btn"
                    onClick={() => setShowAddExpenseForm(false)}
                  >
                    ×
                  </button>
                </div>
                
                <div className="expense-form">
                  <input
                    type="text"
                    placeholder="Vendor Name"
                    value={expenseDetails.vendor}
                    onChange={(e) => setExpenseDetails({...expenseDetails, vendor: e.target.value})}
                    className="form-input"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={expenseDetails.amount}
                    onChange={(e) => setExpenseDetails({...expenseDetails, amount: e.target.value})}
                    className="form-input"
                  />
                  <input
                    type="date"
                    value={expenseDetails.date}
                    onChange={(e) => setExpenseDetails({...expenseDetails, date: e.target.value})}
                    className="form-input"
                  />
                  <textarea
                    placeholder="Comments (optional)"
                    value={expenseDetails.comments}
                    onChange={(e) => setExpenseDetails({...expenseDetails, comments: e.target.value})}
                    className="form-textarea"
                    rows="3"
                  />
                  
                  <div className="receipt-upload">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleReceiptUpload(e.target.files[0])}
                      className="receipt-input"
                      disabled={isProcessingReceipt}
                    />
                    {isProcessingReceipt && (
                      <span className="processing-text">Processing receipt...</span>
                    )}
                    {expenseDetails.receipt && (
                      <img src={expenseDetails.receipt} alt="Receipt Preview" className="receipt-preview" />
                    )}
                  </div>
                  
                  <div className="modal-actions">
                    <button 
                      onClick={() => setShowAddExpenseForm(false)}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleAddExpenseInEdit()}
                      disabled={!expenseDetails.vendor || !expenseDetails.amount || !expenseDetails.date || !expenseDetails.receipt}
                      className="save-expense-btn"
                    >
                      Save Expense
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
              <label className="field-label">Project (Optional)</label>
              <select
                value={tripDetails.projectName}
                onChange={(e) => setTripDetails({
                  ...tripDetails,
                  projectName: e.target.value
                })}
                className="project-select"
              >
                <option value="">Select a project (optional)</option>
                {projects.map((projectName, index) => (
                  <option key={index} value={projectName}>
                    {projectName}
                  </option>
                ))}
              </select>
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
            
            <div className="receipts-section">
              <h3>Expenses</h3>
              {receipts.length > 0 ? (
                <table className="receipts-table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Comments</th>
                      <th>Receipt</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt, index) => (
                      <tr key={index}>
                        <td>{receipt.vendor}</td>
                        <td>${receipt.amount}</td>
                        <td>{receipt.date}</td>
                        <td>{receipt.comments}</td>
                        <td>
                          {receipt.receipt && (
                            <img src={receipt.receipt} alt="Receipt" className="receipt-thumbnail" />
                          )}
                        </td>
                        <td>
                          <button 
                            onClick={() => {
                              setTotalAmount(prev => prev - receipt.amount);
                              setReceipts(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="remove-receipt-btn"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-expenses">No expenses added yet. Click "Add Expense" to get started.</p>
              )}
            </div>
          </div>
          
          <div className="draft-actions">
            {hasDraft && (
              <button
                className="load-draft-btn"
                onClick={handleLoadDraft}
                style={{ background: '#28a745', color: 'white', marginRight: '10px' }}
              >
                Continue Previous Draft
              </button>
            )}
            <button
              className="save-draft-btn"
              onClick={handleSaveDraft}
              disabled={!tripDetails.tripName}
              style={{ background: '#ffc107', color: 'black', marginRight: '10px' }}
            >
              Save as Draft
            </button>
          </div>
          
          
        </div>
      )}      {isSubmitting && (expenseView === 'new' || expenseView === 'edit') && (
        <div className="processing-overlay">
          <div className="processing-popup">
            <div className="processing-spinner">⏳</div>
            <h3>
              {expenseView === 'edit' ? 'Saving Changes...' : 'Submitting Your Report...'}
            </h3>
            <p>Processing {receipts.length} expense(s)</p>
            <p>Total Amount: ${totalAmount.toFixed(2)}</p>
            <p>Please wait, do not close this window.</p>
          </div>
        </div>
      )}
      {isExpenseModalOpen && selectedExpense && (
        <div className="expense-modal-overlay" onClick={() => setIsExpenseModalOpen(false)}>
          <div className="expense-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn"
              onClick={() => setIsExpenseModalOpen(false)}
            >
              ×
            </button>
            
            <div className="expense-modal-content">
              <div className="expense-modal-image">
                <img 
                  src={selectedExpense.receipt} 
                  alt="Receipt" 
                  className="full-receipt-image"
                />
              </div>
              
              <div className="expense-modal-details">
                <h3>Expense Details</h3>
                <div className="detail-row">
                  <span className="detail-label">Project:</span>
                  <span className="detail-value">{selectedExpense.tripProjectName || 'No project assigned'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Vendor:</span>
                  <span className="detail-value">{selectedExpense.vendor}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Amount:</span>
                  <span className="detail-value">${selectedExpense.amount}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{new Date(selectedExpense.date).toLocaleDateString()}</span>
                </div>
                
                <button 
                  className="download-receipt-btn"
                  onClick={() => downloadReceipt(selectedExpense)}
                >
                  Download Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseManager;
               