import React, { useState, useEffect, useMemo } from 'react';
import './Login.css';
// Add this import at the top
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);


// Add this after your imports
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
// Add this right after your pdfjs.GlobalWorkerOptions.workerSrc line
console.log('PDF.js version:', pdfjs.version);
console.log('Worker src:', pdfjs.GlobalWorkerOptions.workerSrc);


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
  const [isModerator, setIsModerator] = useState(false);

  const [analyticsMonth, setAnalyticsMonth] = useState(new Date());
  const [analyticsStatus, setAnalyticsStatus] = useState('approved');
  const [projectAnalytics, setProjectAnalytics] = useState([]);
  const [selectedProjectExpenses, setSelectedProjectExpenses] = useState([]);
  const [showProjectExpensesModal, setShowProjectExpensesModal] = useState(false);
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [selectedTripDetails, setSelectedTripDetails] = useState(null);
  const [showTripDetailsModal, setShowTripDetailsModal] = useState(false);
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);
  // Add these state variables with your other useState declarations
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState('');
  const [previewPdfName, setPreviewPdfName] = useState('');
  // Add these state variables
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);





  



  
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
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [showDecisionConfirmation, setShowDecisionConfirmation] = useState(false);
  const [showBatchConfirmation, setShowBatchConfirmation] = useState(false);
  const [pendingDecision, setPendingDecision] = useState(null); // Store trip info for single decision



  const ADMIN_EMAILS = useMemo(() => [
    'pgupta@recurringdecimal.com',
    'kkarumudi@recurringdecimal.com',
    'sn@recurringdecimal.com'
  ], []);

  useEffect(() => {
    fetchTrips();
    checkForDraft();
    fetchProjects(); // ADD THIS LINE
    if (user?.username) {
      console.log('=== MODERATOR DEBUG ===');
      console.log('User object:', user);
      console.log('User email being checked:', user.username);
      console.log('Making request to:', `${API_URL}/api/moderators/check/${user.username}`);
      
      fetch(`${API_URL}/api/moderators/check/${user.username}`)
        .then(res => res.json())
        .then(data => {
          console.log('Moderator check response:', data);
          setIsModerator(data.isModerator);
        })
        .catch(err => console.error('Failed to check moderator status:', err));
    }
  }, [user, isModerator]);
 
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchTrips = async () => {
    try {
      console.log('Current user:', user.username);
      console.log('Is admin?', ADMIN_EMAILS.includes(user.username));
      
      // For guest users, use the isModerator from user object, otherwise use local state
      const userIsModerator = user.isGuest ? user.isModerator : isModerator;
      console.log('Is moderator?', userIsModerator);
      
      const response = await fetch(`${API_URL}/api/trips?email=${user.username}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trips');
      }
      const data = await response.json();
      console.log('All trips from server:', data);
      
      // Updated logic: Show all trips if user is admin OR moderator
      const filteredTrips = (ADMIN_EMAILS.includes(user.username) || userIsModerator)
        ? data
        : data.filter(trip => trip.email === user.username);
      
      console.log('Filtered trips:', filteredTrips);
      setTrips(filteredTrips);
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
    setIsProcessingReceipt(true);
    
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
          reader.onloadend = () => {
            console.log('FileReader result:', reader.result);
            console.log('FileReader result type:', typeof reader.result);
            resolve(reader.result);
          };
          reader.readAsDataURL(file);
        });

        const base64Receipt = await base64Promise;
        
        console.log('Setting expenseDetails with receipt:', base64Receipt);
        console.log('base64Receipt type:', typeof base64Receipt);
        
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
      setIsProcessingReceipt(false);
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
    setPendingDecision({ tripId, trip });
    setShowDecisionConfirmation(true);
  };

  const handleConfirmedDecision = async () => {
    setShowDecisionConfirmation(false);
    setIsProcessingDecision(true); // Add this line
    
    const { tripId, trip } = pendingDecision;
    
    try {
      const response = await fetch(`${API_URL}/api/trips/${tripId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: trip.status,
          reason: trip.reason,
          approvedBy: user.username
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
    } finally {
      setIsProcessingDecision(false); // Add this line
    }
    setPendingDecision(null);
  };


  const handleSubmitBatchDecisions = async () => {
    setShowBatchConfirmation(true);
  };

  const handleConfirmedBatchDecisions = async () => {
    setShowBatchConfirmation(false);
    setIsProcessingDecision(true); // Add this line
    
    try {
      // Create an array of promises for each selected trip
      const updatePromises = selectedTrips.map(tripId => {
        const trip = trips.find(t => t._id === tripId);
        return fetch(`${API_URL}/api/trips/${tripId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: trip.status,
            reason: trip.reason,
            approvedBy: user.username
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
    } finally {
      setIsProcessingDecision(false); // Add this line
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
            comments: receipt.comments,
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
    // Show custom confirmation modal instead of browser confirm
    setShowSubmitConfirmation(true);
  };

  // Create a new function for the actual submission
  const handleConfirmedSubmit = async () => {
    setShowSubmitConfirmation(false);
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
    setIsSavingDraft(true);
    try {
      const draftData = {
        tripName: tripDetails.tripName,
        projectName: tripDetails.projectName,
        dateRange: {
          start: tripDetails.dateRange.start || null, // Convert empty string to null
          end: tripDetails.dateRange.end || null     // Convert empty string to null
        },
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
      setExpenseView('list');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };
  const handleLoadDraft = async () => {
    setIsLoadingDraft(true);
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
          start: draft.dateRange.start ? new Date(draft.dateRange.start).toISOString().split('T')[0] : '',
          end: draft.dateRange.end ? new Date(draft.dateRange.end).toISOString().split('T')[0] : ''
        }
      });
      setReceipts(draft.expenses || []);
      setTotalAmount(draft.totalAmount || 0);
      setExpenseView('new');
    } catch (error) {
      console.error('Error loading draft:', error);
      alert('Failed to load draft');
    } finally {
      setIsLoadingDraft(false);
    }
  };  
    const downloadReceipt = (expense) => {
    const link = document.createElement('a');
    link.href = expense.receipt;
    
    // Detect file type from base64 data
    let fileExtension = '.jpg'; // default
    if (expense.receipt.startsWith('data:application/pdf')) {
      fileExtension = '.pdf';
    } else if (expense.receipt.startsWith('data:image/png')) {
      fileExtension = '.png';
    } else if (expense.receipt.startsWith('data:image/jpeg') || expense.receipt.startsWith('data:image/jpg')) {
      fileExtension = '.jpg';
    }
    
    // Format: Receipt_VendorName_Date.extension
    const date = new Date(expense.date).toISOString().split('T')[0];
    const vendorName = expense.vendor.replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `Receipt_${vendorName}_${date}${fileExtension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const renderReceiptPreview = (receipt) => {
    console.log('renderReceiptPreview called with:', receipt);
    console.log('Type:', typeof receipt);
    
    if (!receipt) {
      console.log('No receipt provided');
      return null;
    }
    
    if (typeof receipt !== 'string') {
      console.error('Receipt is not a string:', receipt);
      console.error('Receipt type:', typeof receipt);
      return <div>Error: Invalid receipt data (not a string)</div>;
    }
    
    try {
      const isPDF = receipt.includes('data:application/pdf') || receipt.toLowerCase().includes('.pdf');
      
      if (isPDF) {
        return (
          <div className="pdf-preview-container">
            <Document
              file={receipt}
              onLoadSuccess={({ numPages }) => {
                console.log('PDF loaded successfully, pages:', numPages);
                setNumPages(numPages);
              }}
              onLoadError={(error) => {
                console.error('PDF load error:', error);
                console.log('Receipt data length:', receipt.length);
                console.log('Receipt starts with:', receipt.substring(0, 50));
              }}
              loading={<div>Loading PDF...</div>}
              error={<div>Failed to load PDF. <button onClick={() => window.open(receipt, '_blank')}>Open in new tab</button></div>}
            >
              <Page
                pageNumber={pageNumber}
                width={500}
                scale={1.5}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onLoadSuccess={() => console.log('Page loaded successfully')}
                onLoadError={(error) => console.error('Page load error:', error)}
              />
            </Document>
            
            {numPages > 1 && (
              <div className="pdf-navigation">
                <button
                  onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                  disabled={pageNumber <= 1}
                >
                  Previous
                </button>
                <span>Page {pageNumber} of {numPages}</span>
                <button
                  onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                  disabled={pageNumber >= numPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        );
      } else {
        return <img src={receipt} alt="Receipt Preview" className="receipt-preview" />;
      }
    } catch (error) {
      console.error('Error in renderReceiptPreview:', error);
      return <div>Error rendering receipt preview</div>;
    }
  };


  const fetchAnalyticsData = async () => {
    try {
      console.log('Fetching analytics data for:', analyticsMonth, analyticsStatus);
      
      const startOfMonth = new Date(analyticsMonth.getFullYear(), analyticsMonth.getMonth(), 1);
      const endOfMonth = new Date(analyticsMonth.getFullYear(), analyticsMonth.getMonth() + 1, 0);
      
      const response = await fetch(`${API_URL}/api/trips?email=${user.username}`);
      const allTrips = await response.json();
      
      console.log('All trips:', allTrips);
      
      // Filter trips by month and status
      const filteredTrips = allTrips.filter(trip => {
        const tripStartDate = new Date(trip.dateRange.start);
        const tripEndDate = new Date(trip.dateRange.end);
        
        const matchesMonth = (tripStartDate <= endOfMonth && tripEndDate >= startOfMonth);
        const matchesStatus = analyticsStatus === 'all' || trip.status === analyticsStatus;
        
        return matchesMonth && matchesStatus;
      });
      
      console.log('Filtered trips:', filteredTrips);
      
      // Group trips by project
      const projectData = {};
      
      filteredTrips.forEach(trip => {
        const projectName = trip.projectName || 'No Project';
        
        if (!projectData[projectName]) {
          projectData[projectName] = {
            totalAmount: 0,
            expenseCount: 0,
            trips: []
          };
        }
        
        // Count this as one report
        projectData[projectName].expenseCount += 1;
        projectData[projectName].totalAmount += trip.totalAmount;
        projectData[projectName].trips.push(trip);
      });
      
      const analyticsData = Object.entries(projectData).map(([name, data]) => ({
        projectName: name,
        totalAmount: data.totalAmount,
        expenseCount: data.expenseCount,
        trips: data.trips
      }));
      
      console.log('Analytics data:', analyticsData);
      setProjectAnalytics(analyticsData);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  };


  const handleProjectClick = (projectName) => {
    console.log('Project clicked:', projectName); // Add this debug line
    const project = projectAnalytics.find(p => p.projectName === projectName);
    console.log('Found project:', project); // Add this debug line
    if (project) {
      setSelectedProjectExpenses(project.trips); // We'll store trips here instead of expenses
      setSelectedProjectName(projectName);
      setShowProjectExpensesModal(true);
    }
  };

  const handleTripClick = (trip) => {
    setSelectedTripDetails(trip);
    setShowTripDetailsModal(true);
  };


  useEffect(() => {
    if (expenseView === 'analytics') {
      fetchAnalyticsData();
    }
  }, [analyticsMonth, analyticsStatus, expenseView]);



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
          {(ADMIN_EMAILS.includes(user?.username) || (user?.isGuest ? user?.isModerator : isModerator)) && (
            <button
              className="approve-deny-btn"
              onClick={() => setExpenseView('approve')}
            >
              Approve/Deny Reports
            </button>
          )}
          {(ADMIN_EMAILS.includes(user?.username)) && (
            <button
              className="analytics-button"
              onClick={() => setExpenseView('analytics')}
            >
              Expense Analytics
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
                                <h4>
                                  Project: {trip.projectName}
                                  {trip.submittedAt && (
                                    <span style={{marginLeft: '20px', color: '#666', fontSize: '0.8em', fontWeight: 'normal'}}>
                                      (Report Submitted at: {new Date(trip.submittedAt).toLocaleDateString()})
                                    </span>
                                  )}
                                </h4>
                              </div>
                            )}

                            {trip.approvedBy && (
                              <>
                                <div className={`detail-row ${trip.status === 'approved' ? 'approved-status' : trip.status === 'denied' ? 'denied-status' : ''}`}>
                                  <span className="detail-label">{trip.status === 'approved' ? 'Approved by:' : 'Denied by:'}</span>
                                  <span className="detail-value">{trip.approvedBy}</span>
                                </div>
                                <div className={`detail-row ${trip.status === 'approved' ? 'approved-status' : trip.status === 'denied' ? 'denied-status' : ''}`}>
                                  <span className="detail-label">{trip.status === 'approved' ? 'Approved on:' : 'Denied on:'}</span>
                                  <span className="detail-value">{new Date(trip.approvedAt).toLocaleDateString()}</span>
                                </div>
                              </>
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
            <div className="ai-prompt">
              <p>💡 <strong>Tip:</strong> Upload a receipt and our AI will automatically fill in the vendor, amount, and date for you!</p>
            </div>
            <input
              type="text"
              placeholder="Vendor Name"
              value={expenseDetails.vendor}
              onChange={(e) => setExpenseDetails({...expenseDetails, vendor: e.target.value})}
            />
            <input
              type="text" // Change from "number" to "text" so we can format it
              placeholder="$0.00"
              value={expenseDetails.amount ? `$${parseFloat(expenseDetails.amount).toFixed(2)}` : ''}
              onChange={(e) => {
                // Remove dollar sign and any non-numeric characters except decimal
                let value = e.target.value.replace(/[^0-9.]/g, '');
                
                // Ensure only one decimal point
                const parts = value.split('.');
                if (parts.length > 2) {
                  value = parts[0] + '.' + parts.slice(1).join('');
                }
                
                // Limit to 2 decimal places
                if (parts[1] && parts[1].length > 2) {
                  value = parts[0] + '.' + parts[1].substring(0, 2);
                }
                
                setExpenseDetails({...expenseDetails, amount: value});
              }}
              onBlur={(e) => {
                // Format to 2 decimal places when user leaves the field
                if (expenseDetails.amount && !isNaN(expenseDetails.amount)) {
                  const formatted = parseFloat(expenseDetails.amount).toFixed(2);
                  setExpenseDetails({...expenseDetails, amount: formatted});
                }
              }}
              className="form-input"
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
              {expenseDetails.receipt && renderReceiptPreview(expenseDetails.receipt)}
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
                          placeholder="* Reason for decision... *"
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
                            
                            {trip.approvedBy && (
                              <>
                                <div className={`detail-row ${trip.status === 'approved' ? 'approved-status' : trip.status === 'denied' ? 'denied-status' : ''}`}>
                                  <span className="detail-label">{trip.status === 'approved' ? 'Approved by:' : 'Denied by:'}</span>
                                  <span className="detail-value">{trip.approvedBy}</span>
                                </div>
                                <div className={`detail-row ${trip.status === 'approved' ? 'approved-status' : trip.status === 'denied' ? 'denied-status' : ''}`}>
                                  <span className="detail-label">{trip.status === 'approved' ? 'Approved on:' : 'Denied on:'}</span>
                                  <span className="detail-value">{new Date(trip.approvedAt).toLocaleDateString()}</span>
                                </div>
                              </>
                            )}

                            {trip.approvedBy && (
                              <>
                                <div className="detail-row">
                                  <span className="detail-label">{trip.status === 'approved' ? 'Approved by:' : 'Denied by:'}</span>
                                  <span className="detail-value">{trip.approvedBy}</span>
                                </div>
                                <div className="detail-row">
                                  <span className="detail-label">{trip.status === 'approved' ? 'Approved on:' : 'Denied on:'}</span>
                                  <span className="detail-value">{new Date(trip.approvedAt).toLocaleDateString()}</span>
                                </div>
                              </>
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

        ) : expenseView === 'analytics' ? (
          <div className="analytics-container">
            <div className="analytics-header">
              <h2>Expense Analytics</h2>
              
              <div className="analytics-controls">
                <div className="month-navigation">
                  <button onClick={() => {
                    const newMonth = new Date(analyticsMonth);
                    newMonth.setMonth(newMonth.getMonth() - 1);
                    setAnalyticsMonth(newMonth);
                  }}>←</button>
                  <span className="current-month">
                    {analyticsMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={() => {
                    const newMonth = new Date(analyticsMonth);
                    newMonth.setMonth(newMonth.getMonth() + 1);
                    setAnalyticsMonth(newMonth);
                  }}>→</button>
                </div>
                
                <div className="status-filter">
                  <label>Status: </label>
                  <select 
                    value={analyticsStatus} 
                    onChange={(e) => setAnalyticsStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="denied">Denied</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="analytics-content">
              {projectAnalytics.length > 0 ? (
                <div className="chart-container">
                  <div className="pie-chart-section">
                    <h3>Project Spending Distribution</h3>
                    <Pie
                      data={{
                        labels: projectAnalytics.map(p => p.projectName),
                        datasets: [{
                          data: projectAnalytics.map(p => p.totalAmount),
                          backgroundColor: [
                            '#FF6384',
                            '#36A2EB',
                            '#FFCE56',
                            '#4BC0C0',
                            '#9966FF',
                            '#FF9F40',
                            '#FF6384',
                            '#C9CBCF',
                            '#E7E9ED',
                            '#71B37C'
                          ],
                          borderWidth: 1
                        }]
                      }}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: {
                            position: 'right',
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const project = projectAnalytics[context.dataIndex];
                                return `${context.label}: $${context.parsed.toFixed(2)} (${project.expenseCount} reports)`;
                              }
                            }
                          }
                        },
                        onClick: (event, elements) => {
                          if (elements.length > 0) {
                            const index = elements[0].index;
                            const projectName = projectAnalytics[index].projectName;
                            handleProjectClick(projectName);
                          }
                        }
                      }}
                    />
                  </div>
                  
                  <div className="analytics-summary">
                    <h3>Project Summary</h3>
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Total Amount</th>
                          <th>Report Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectAnalytics.map((project, index) => (
                          <tr 
                            key={index}
                            onClick={() => handleProjectClick(project.projectName)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td>{project.projectName}</td>
                            <td>${project.totalAmount.toFixed(2)}</td>
                            <td>{project.expenseCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p>No expense data found for the selected month and status.</p>
              )}
            </div>
          </div>

      ) : expenseView === 'edit' ? (
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

            <div className="form-field">
              <label className="field-label">Date Range</label>
              <div className="date-inputs">
                <div className="date-field">
                  <label className="date-label">Start</label>
                  <input
                    type="date"
                    value={tripDetails.dateRange.start.split('T')[0]}
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
                    value={tripDetails.dateRange.end.split('T')[0]}
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
              onClick={() => handleEditSubmit(tripDetails._id)}
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
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
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
                setShowAddExpenseForm(true); // Keep the modal for edit mode
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

          {/* Keep the modal for adding expenses in edit mode */}
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
                <div className="ai-prompt">
                  <p>💡 <strong>Tip:</strong> Upload a receipt and our AI will automatically fill in the vendor, amount, and date for you!</p>
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
                    type="text" // Change from "number" to "text" so we can format it
                    placeholder="$0.00"
                    value={expenseDetails.amount ? `$${parseFloat(expenseDetails.amount).toFixed(2)}` : ''}
                    onChange={(e) => {
                      // Remove dollar sign and any non-numeric characters except decimal
                      let value = e.target.value.replace(/[^0-9.]/g, '');
                      
                      // Ensure only one decimal point
                      const parts = value.split('.');
                      if (parts.length > 2) {
                        value = parts[0] + '.' + parts.slice(1).join('');
                      }
                      
                      // Limit to 2 decimal places
                      if (parts[1] && parts[1].length > 2) {
                        value = parts[0] + '.' + parts[1].substring(0, 2);
                      }
                      
                      setExpenseDetails({...expenseDetails, amount: value});
                    }}
                    onBlur={(e) => {
                      // Format to 2 decimal places when user leaves the field
                      if (expenseDetails.amount && !isNaN(expenseDetails.amount)) {
                        const formatted = parseFloat(expenseDetails.amount).toFixed(2);
                        setExpenseDetails({...expenseDetails, amount: formatted});
                      }
                    }}
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
                    {expenseDetails.receipt && (() => {
                      console.log('About to render receipt preview');
                      console.log('expenseDetails.receipt:', expenseDetails.receipt);
                      console.log('Type of expenseDetails.receipt:', typeof expenseDetails.receipt);
                      console.log('Is it a string?', typeof expenseDetails.receipt === 'string');
                      return renderReceiptPreview(expenseDetails.receipt);
                    })()}
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
            <div className="draft-actions">
              {hasDraft && (
                <button
                  className="load-draft-btn"
                  onClick={handleLoadDraft}
                  disabled={isLoadingDraft}
                  style={{ 
                    background: isLoadingDraft ? '#6c757d' : '#28a745', 
                    color: 'white', 
                    marginRight: '10px',
                    cursor: isLoadingDraft ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoadingDraft ? (
                    <>
                      <span className="processing-spinner"></span>
                      Loading Draft...
                    </>
                  ) : (
                    'Continue Previous Draft'
                  )}
                </button>
              )}
              <button
                className="save-draft-btn"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                style={{ 
                  background: isSavingDraft ? '#6c757d' : '#ffc107', 
                  color: 'black', 
                  marginRight: '10px',
                  cursor: isSavingDraft ? 'not-allowed' : 'pointer'
                }}
              >
                {isSavingDraft ? (
                  <>
                    <span className="processing-spinner"></span>
                    Saving Draft...
                  </>
                ) : (
                  'Save as Draft'
                )}
              </button>
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

      {isProcessingDecision && (
        <div className="processing-overlay">
          <div className="processing-popup">
            <div className="processing-spinner">⏳</div>
            <h3>Processing Decision...</h3>
            <p>
              {selectedTrips.length > 1 
                ? `Updating ${selectedTrips.length} reports` 
                : 'Updating report status'
              }
            </p>
            <p>Please wait, do not close this window.</p>
          </div>
        </div>
      )}

      {isSavingDraft && (
        <div className="processing-overlay">
          <div className="processing-popup">
            <div className="processing-spinner">⏳</div>
            <h3>Saving Draft...</h3>
            <p>Saving your progress</p>
            <p>Please wait, do not close this window.</p>
          </div>
        </div>
      )}

      {isLoadingDraft && (
        <div className="processing-overlay">
          <div className="processing-popup">
            <div className="processing-spinner">⏳</div>
            <h3>Loading Draft...</h3>
            <p>Restoring your previous work</p>
            <p>Please wait, do not close this window.</p>
          </div>
      </div>
    )}

      {showSubmitConfirmation && (
        <div className="expense-modal-overlay" onClick={() => setShowSubmitConfirmation(false)}>
          <div className="expense-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowSubmitConfirmation(false)}
            >
              ×
            </button>
            
            <div className="expense-modal-content">
              <div className="expense-modal-details">
                <h3>Confirm Report Submission</h3>
                <p>Are you sure you want to submit this expense report?</p>
                
                <div className="detail-row">
                  <span className="detail-label">Report Name:</span>
                  <span className="detail-value">{tripDetails.tripName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total Amount:</span>
                  <span className="detail-value">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Number of Expenses:</span>
                  <span className="detail-value">{receipts.length}</span>
                </div>
                
                <div className="modal-actions" style={{marginTop: '20px'}}>
                  <button
                    onClick={() => setShowSubmitConfirmation(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmedSubmit}
                    className="save-expense-btn"
                  >
                    Submit Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

            {showDecisionConfirmation && pendingDecision && (
        <div className="expense-modal-overlay" onClick={() => setShowDecisionConfirmation(false)}>
          <div className="expense-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowDecisionConfirmation(false)}
            >
              ×
            </button>
            
            <div className="expense-modal-content">
              <div className="expense-modal-details">
                <h3>Confirm Decision</h3>
                <p>Are you sure you want to <strong>{pendingDecision.trip.status}</strong> this report?</p>
                
                <div className="detail-row">
                  <span className="detail-label">Report Name:</span>
                  <span className="detail-value">{pendingDecision.trip.tripName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total Amount:</span>
                  <span className="detail-value">${pendingDecision.trip.totalAmount?.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Decision:</span>
                  <span className="detail-value">{pendingDecision.trip.status}</span>
                </div>
                {pendingDecision.trip.reason && (
                  <div className="detail-row">
                    <span className="detail-label">Reason:</span>
                    <span className="detail-value">{pendingDecision.trip.reason}</span>
                  </div>
                )}
                
                <div className="modal-actions" style={{marginTop: '20px'}}>
                  <button
                    onClick={() => setShowDecisionConfirmation(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmedDecision}
                    className="save-expense-btn"
                  >
                    Confirm {pendingDecision.trip.status}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBatchConfirmation && (
        <div className="expense-modal-overlay" onClick={() => setShowBatchConfirmation(false)}>
          <div className="expense-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowBatchConfirmation(false)}
            >
              ×
            </button>
            
            <div className="expense-modal-content">
              <div className="expense-modal-details">
                <h3>Confirm Batch Decisions</h3>
                <p>Are you sure you want to submit decisions for <strong>{selectedTrips.length}</strong> selected reports?</p>
                
                <div className="detail-row">
                  <span className="detail-label">Selected Reports:</span>
                  <span className="detail-value">{selectedTrips.length}</span>
                </div>
                
                <div className="modal-actions" style={{marginTop: '20px'}}>
                  <button
                    onClick={() => setShowBatchConfirmation(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmedBatchDecisions}
                    className="save-expense-btn"
                  >
                    Submit All Decisions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {showProjectExpensesModal && (
        <div className="modal-overlay" onClick={() => setShowProjectExpensesModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reports for {selectedProjectName}</h3>
              <button 
                className="close-button"
                onClick={() => setShowProjectExpensesModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="project-expenses-table">
              <table className="receipts-table">
                <thead>
                  <tr>
                    <th>Report Name</th>
                    <th>Employee</th>
                    <th>Date Range</th>
                    <th>Total Amount</th>
                    <th>Submitted Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProjectExpenses.map((trip, index) => (
                    <tr key={index}>
                      <td>{trip.tripName}</td>
                      <td>{trip.email}</td>
                      <td>
                        {new Date(trip.dateRange.start).toLocaleDateString()} - 
                        {new Date(trip.dateRange.end).toLocaleDateString()}
                      </td>
                      <td>${trip.totalAmount.toFixed(2)}</td>
                      <td>{new Date(trip.submittedAt).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className="view-details-button"
                          onClick={() => handleTripClick(trip)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {showTripDetailsModal && (
        <div className="modal-overlay" onClick={() => setShowTripDetailsModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Report Details: {selectedTripDetails?.tripName}</h3>
              <button 
                className="close-button"
                onClick={() => setShowTripDetailsModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="trip-info">
              <div className="trip-meta">
                <p><strong>Employee:</strong> {selectedTripDetails?.email}</p>
                <p><strong>Date Range:</strong> {new Date(selectedTripDetails?.dateRange.start).toLocaleDateString()} - {new Date(selectedTripDetails?.dateRange.end).toLocaleDateString()}</p>
                <p><strong>Submitted:</strong> {new Date(selectedTripDetails?.submittedAt).toLocaleDateString()}</p>
                <p><strong>Total Amount:</strong> ${selectedTripDetails?.totalAmount.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="project-expenses-table">
              <h4>Expenses</h4>
              <table className="receipts-table">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Vendor</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTripDetails?.expenses?.map((expense, index) => (
                    <tr key={index}>
                      <td>
                        {expense.receipt ? (
                          <img 
                            src={expense.receipt} 
                            alt="Receipt" 
                            className="receipt-thumbnail"
                            onClick={() => window.open(expense.receipt, '_blank')}
                          />
                        ) : (
                          'No receipt'
                        )}
                      </td>
                      <td>{expense.vendor}</td>
                      <td>${expense.amount.toFixed(2)}</td>
                      <td>{new Date(expense.date).toLocaleDateString()}</td>
                      <td>{expense.comments || 'No comments'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                {selectedExpense.receipt && (
                  selectedExpense.receipt.includes('data:application/pdf') ? (
                    <div className="pdf-viewer-container">
                      <iframe
                        src={`${selectedExpense.receipt}#toolbar=0&navpanes=0&scrollbar=0`}
                        width="100%"
                        height="100%"
                        title="Receipt PDF"
                        style={{ border: 'none', borderRadius: '8px' }}
                      />
                    </div>
                  ) : (
                    <img 
                      src={selectedExpense.receipt} 
                      alt="Receipt" 
                      className="full-receipt-image"
                    />
                  )
                )}
              </div>
              
              <div className="expense-modal-details">
                <h3>Expense Details</h3>
                <div className="detail-row">
                  <span className="detail-label">Project:</span>
                  <span className="detail-value">
                    {selectedExpense.tripProjectName || 'No project assigned'} 
                    {selectedExpense.trip?.submittedAt && (
                      <span style={{marginLeft: '20px', color: '#666', fontSize: '0.9em'}}>
                        (Report Submitted at: {new Date(selectedExpense.trip.submittedAt).toLocaleDateString()})
                      </span>
                    )}
                  </span>
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
                
                <div className="detail-row">
                  <span className="detail-label">Comments:</span>
                  <span className="detail-value">{selectedExpense.comments || 'No comments'}</span>
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
                                