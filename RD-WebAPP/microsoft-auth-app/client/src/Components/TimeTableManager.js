import React, { useState, useMemo, useEffect, useCallback } from 'react';
import './TimeTableManager.css';

const HistoryView = React.memo(({ 
  userHistoryProjects, 
  userHistoryTimesheets, 
  selectedHistoryProjectId, 
  expandedTimesheet,
  currentHistoryProjectPage,
  currentHistoryTimesheetPage,
  fetchUserHistoryProjects,
  fetchUserProjectTimesheets,
  setExpandedTimesheet,
  setCurrentHistoryProjectPage,
  setCurrentHistoryTimesheetPage,
  handleBackToProjects,
  handleBackToList,
  projects,
  setSelectedProjectDetails,
  setView,
  setSelectedHistoryProjectId,
  setUserHistoryTimesheets,
  isAdminOnly,    // Add this
  isModerator     // Add this
}) => {

  // Move these constants inside the component
  const historyProjectsPerPage = 2;
  const historyTimesheetsPerPage = 2;
  
  // Move these helper functions inside the component
  const getPaginatedHistoryProjects = (projects) => {
    const startIndex = (currentHistoryProjectPage - 1) * historyProjectsPerPage;
    const endIndex = startIndex + historyProjectsPerPage;
    return projects.slice(startIndex, endIndex);
  };

  const getPaginatedHistoryTimesheets = (timesheets) => {
    const startIndex = (currentHistoryTimesheetPage - 1) * historyTimesheetsPerPage;
    const endIndex = startIndex + historyTimesheetsPerPage;
    return timesheets.slice(startIndex, endIndex);
  };

  useEffect(() => {
    fetchUserHistoryProjects();
  }, [fetchUserHistoryProjects]);
    if (selectedHistoryProjectId) {
      const project = projects.find(p => p._id === selectedHistoryProjectId);
      
      return (
        <div className="approval-table-view">
          <div className="approval-header">
            <h2>Your Timesheets for {project?.projectName}</h2>
            <button 
              className="back-button"
              onClick={() => {
                setSelectedHistoryProjectId(null);
                setUserHistoryTimesheets([]);
                setCurrentHistoryTimesheetPage(1);
              }}
            >
              Back to Projects
            </button>
          </div>
          
          {userHistoryTimesheets.length === 0 ? (
            <div className="no-reports">
              <p>No timesheets found for this project.</p>
            </div>
          ) : (
            <>
              <div className="approval-table-container">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th>Total Hours</th>
                      <th>Status</th>
                      <th>Submitted Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedHistoryTimesheets(userHistoryTimesheets).map(timesheet => (
                      <React.Fragment key={timesheet._id}>
                        <tr className="report-row">
                          <td className="date-range">
                            {new Date(timesheet.weekStartDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} - {new Date(timesheet.weekEndDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                          </td>
                          <td className="amount">{timesheet.totalHours.toFixed(1)} hrs</td>
                          <td>
                            <span className={`status-badge ${timesheet.status}`}>{timesheet.status}</span>
                          </td>
                          <td>{new Date(timesheet.submittedDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</td>
                          <td className="actions-cell-horizontal">
                            <button
                              className="details-toggle-button"
                              onClick={() => setExpandedTimesheet(expandedTimesheet === timesheet._id ? null : timesheet._id)}
                            >
                              {expandedTimesheet === timesheet._id ? 'Hide' : 'Details'}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Expandable Details Row */}
                        {expandedTimesheet === timesheet._id && (
                          <tr className="expanded-row">
                            <td colSpan="5">
                              <div className="trip-details-expanded">

                                <div className="submission-info-section">
                                  <h4>Submission Details:</h4>
                                  <div className="detail-row">
                                    <span className="detail-label">Submitted on:</span>
                                    <span className="detail-value">
                                      {new Date(timesheet.submittedDate).toLocaleDateString('en-US', { 
                                        timeZone: 'UTC',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Approval information */}
                                {timesheet.approverEmail && (
                                  <div className={`approval-info-section ${timesheet.status === 'approved' ? 'approved-status' : timesheet.status === 'denied' ? 'denied-status' : ''}`}>
                                    <h4>Approval Details:</h4>
                                    <div className="detail-row">
                                      <span className="detail-label">{timesheet.status === 'approved' ? 'Approved by:' : 'Denied by:'}</span>
                                      <span className="detail-value">{timesheet.approverEmail}</span>
                                    </div>
                                    {timesheet.approvedDate && (
                                      <div className="detail-row">
                                        <span className="detail-label">{timesheet.status === 'approved' ? 'Approved on:' : 'Denied on:'}</span>
                                        <span className="detail-value">{new Date(timesheet.approvedDate).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Employee's week comments */}
                                {timesheet.comments && (
                                  <div className="detail-row">
                                    <span className="detail-label">Week Comments:</span>
                                    <span className="detail-value">{timesheet.comments}</span>
                                  </div>
                                )}
                                
                                {/* Approval comments */}
                                {timesheet.approvalComments && (
                                  <div className="detail-row">
                                    <span className="detail-label">Approval Comments:</span>
                                    <span className="detail-value">{timesheet.approvalComments}</span>
                                  </div>
                                )}
                                
                                {/* Daily breakdown */}
                                <h4>Daily Breakdown</h4>
                                <div className="expenses-list">
                                  {timesheet.dayEntries.map((day, index) => (
                                    <div key={index} className="expense-item">
                                      <div className="expense-details">
                                        <p>Date: {new Date(day.date).toLocaleDateString()}</p>
                                        <p>Hours: {day.hours}</p>
                                        {day.notes && <p>Notes: {day.notes}</p>}
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
              </div>

              {/* Pagination Controls for History Timesheets */}
              <div className="pagination-container">
                <div className="pagination-info">
                  Showing {Math.min((currentHistoryTimesheetPage - 1) * historyTimesheetsPerPage + 1, userHistoryTimesheets.length)} to {Math.min(currentHistoryTimesheetPage * historyTimesheetsPerPage, userHistoryTimesheets.length)} of {userHistoryTimesheets.length} timesheets
                </div>
                
                <div className="pagination-controls">
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentHistoryTimesheetPage(1)}
                    disabled={currentHistoryTimesheetPage === 1}
                  >
                    First
                  </button>
                  
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentHistoryTimesheetPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentHistoryTimesheetPage === 1}
                  >
                    Previous
                  </button>
                  
                  <span className="page-info">
                    Page {currentHistoryTimesheetPage} of {Math.ceil(userHistoryTimesheets.length / historyTimesheetsPerPage)}
                  </span>
                  
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentHistoryTimesheetPage(prev => Math.min(prev + 1, Math.ceil(userHistoryTimesheets.length / historyTimesheetsPerPage)))}
                    disabled={currentHistoryTimesheetPage === Math.ceil(userHistoryTimesheets.length / historyTimesheetsPerPage)}
                  >
                    Next
                  </button>
                  
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentHistoryTimesheetPage(Math.ceil(userHistoryTimesheets.length / historyTimesheetsPerPage))}
                    disabled={currentHistoryTimesheetPage === Math.ceil(userHistoryTimesheets.length / historyTimesheetsPerPage)}
                  >
                    Last
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    return (
      <div className="approval-table-view">
        <div className="approval-header">
          <h2>Your Timesheet History</h2>
          <button 
            className="back-button"
            onClick={() => setView('list')}
          >
            Back to Timesheet
          </button>
        </div>
        
        {userHistoryProjects.length === 0 ? (
          <div className="no-reports">
            <p>You haven't submitted any timesheets yet.</p>
          </div>
        ) : (
          <>
            <div className="approval-table-container">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Client</th>
                    <th>Total Timesheets</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedHistoryProjects(userHistoryProjects).map(project => (
                    <tr key={project._id} className="report-row">
                      <td className="report-name">{project.projectName}</td>
                      <td>{project.clientName}</td>
                      <td className="amount">{project.timesheetCount}</td>
                      <td className="actions-cell-horizontal">
                        <button
                          className="edit-button"
                          onClick={() => fetchUserProjectTimesheets(project._id)}
                        >
                          View Timesheets
                        </button>
                        {(isAdminOnly || isModerator) && (
                          <button
                            className="details-button"
                            onClick={() => setSelectedProjectDetails(projects.find(p => p._id === project._id))}
                          >
                            Details
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for History Projects */}
            <div className="pagination-container">
              <div className="pagination-info">
                Showing {Math.min((currentHistoryProjectPage - 1) * historyProjectsPerPage + 1, userHistoryProjects.length)} to {Math.min(currentHistoryProjectPage * historyProjectsPerPage, userHistoryProjects.length)} of {userHistoryProjects.length} projects
              </div>
              
              <div className="pagination-controls">
                <button 
                  className="pagination-btn"
                  onClick={() => setCurrentHistoryProjectPage(1)}
                  disabled={currentHistoryProjectPage === 1}
                >
                  First
                </button>
                
                <button 
                  className="pagination-btn"
                  onClick={() => setCurrentHistoryProjectPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentHistoryProjectPage === 1}
                >
                  Previous
                </button>
                
                <span className="page-info">
                  Page {currentHistoryProjectPage} of {Math.ceil(userHistoryProjects.length / historyProjectsPerPage)}
                </span>
                
                <button 
                  className="pagination-btn"
                  onClick={() => setCurrentHistoryProjectPage(prev => Math.min(prev + 1, Math.ceil(userHistoryProjects.length / historyProjectsPerPage)))}
                  disabled={currentHistoryProjectPage === Math.ceil(userHistoryProjects.length / historyProjectsPerPage)}
                >
                  Next
                </button>
                
                <button 
                  className="pagination-btn"
                  onClick={() => setCurrentHistoryProjectPage(Math.ceil(userHistoryProjects.length / historyProjectsPerPage))}
                  disabled={currentHistoryProjectPage === Math.ceil(userHistoryProjects.length / historyProjectsPerPage)}
                >
                  Last
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  });

function TimeTableManager({ onBack, user }) {
  const API_URL = useMemo(() => process.env.REACT_APP_API_URL || 'http://localhost:5000', []);
  const [view, setView] = useState('list');
  const [projects, setProjects] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(getDefaultWeek());
  const [timeEntries, setTimeEntries] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [selectedProjectTimesheets, setSelectedProjectTimesheets] = useState([]);
  const [timesheetStatusUpdates, setTimesheetStatusUpdates] = useState({});
  const [approvalDateRange, setApprovalDateRange] = useState({
    start: startOfCurrentMonth(),
    end: endOfCurrentMonth()
  });
  const [isModerator, setIsModerator] = useState(false);
  const [dayHours, setDayHours] = useState({
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0
  });
  const [weeklyEntries, setWeeklyEntries] = useState([]);
  const [totalHours, setTotalHours] = useState({
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0,
    total: 0
  });

  // New project form state
  const [newProject, setNewProject] = useState({
    projectName: '',
    clientName: '',
    projectType: '',
    poNumber: '',
    contractNumber: '',
    dateRange: {
      start: '',
      end: ''
    },
    maxHours: '',
    maxBudget: '',
    approvers: '',
    projectMembers: '',
    location: '',
    isHybrid: false
  });

  const [userHistoryProjects, setUserHistoryProjects] = useState([]);
  const [selectedHistoryProjectId, setSelectedHistoryProjectId] = useState(null);
  const [userHistoryTimesheets, setUserHistoryTimesheets] = useState([]);
  const [projectTimesheetCounts, setProjectTimesheetCounts] = useState({});

  const ADMIN_EMAILS = useMemo(() => [
    'pgupta@recurringdecimal.com',
    'kkarumudi@recurringdecimal.com',
    'sn@recurringdecimal.com'
  ], []);

  const isAdmin = (ADMIN_EMAILS.includes(user?.username) || isModerator);
  
  const [weekComments, setWeekComments] = useState('');
  const [expandedTimesheet, setExpandedTimesheet] = useState(null);

  // Update your ADMIN_EMAILS check to exclude moderators for this feature
  const isAdminOnly = ADMIN_EMAILS.includes(user?.username); // Only true admins, not moderators

  // Add new state variables for the calendar dashboard
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDayData, setSelectedDayData] = useState([]);
  const [rightPanelView, setRightPanelView] = useState('employee'); // 'employee' or 'project'
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [employeeTimeRange, setEmployeeTimeRange] = useState('week'); // 'week', '2weeks', 'month'
  const [employeeData, setEmployeeData] = useState([]);
  const [projectData, setProjectData] = useState([]);
  const [projectTimeRange, setProjectTimeRange] = useState('month');
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedTimesheets, setSelectedTimesheets] = useState([]);
  const [currentProjectPage, setCurrentProjectPage] = useState(1);
  const [currentTimesheetPage, setCurrentTimesheetPage] = useState(1);
  const projectsPerPage = 2;
  const timesheetsPerPage = 2;
  const [currentHistoryProjectPage, setCurrentHistoryProjectPage] = useState(1);
  const [currentHistoryTimesheetPage, setCurrentHistoryTimesheetPage] = useState(1);
  const historyProjectsPerPage = 2;
  const historyTimesheetsPerPage = 2;
  const [selectedProjectDetails, setSelectedProjectDetails] = useState(null);
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);
  const [showDecisionConfirmation, setShowDecisionConfirmation] = useState(false);
  const [pendingDecision, setPendingDecision] = useState(null);
  const [showBatchConfirmation, setShowBatchConfirmation] = useState(false);
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('all');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  // Add these state variables
  const [isLoadingEmployeeData, setIsLoadingEmployeeData] = useState(false);
  const [isLoadingProjectData, setIsLoadingProjectData] = useState(false);
  // Add this with your other useState declarations
  const [isLoadingCalendarData, setIsLoadingCalendarData] = useState(false);
  const [calendarDataCache, setCalendarDataCache] = useState({});
  // Add these state variables with your other useState declarations
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [isSubmittingTimesheet, setIsSubmittingTimesheet] = useState(false);
  // Add these with your other useState declarations
  const [showCreateProjectConfirmation, setShowCreateProjectConfirmation] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  // Add this state variable
  const [activeTimesheetForComments, setActiveTimesheetForComments] = useState(null);

  // Add these state variables with your other useState declarations
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectForm, setEditProjectForm] = useState({
    projectName: '',
    clientName: '',
    projectType: '',
    poNumber: '',
    contractNumber: '',
    dateRange: { start: '', end: '' },
    maxHours: '',
    maxBudget: '',
    approvers: '',
    projectMembers: '',
    location: '',
    isHybrid: false,
    isActive: true
  });
  const [showEditProjectConfirmation, setShowEditProjectConfirmation] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [showHourLimitModal, setShowHourLimitModal] = useState(false);
  const [hourLimitDetails, setHourLimitDetails] = useState({ day: '', hours: 0, dayTotal: 0 });
  // Add these state variables with your other useState declarations
  const [holidays, setHolidays] = useState([]);
  const [showHolidayWarning, setShowHolidayWarning] = useState(false);
  const [holidayWarningDetails, setHolidayWarningDetails] = useState({});
  // Add these state variables with your other useState declarations
  const [showDeleteHolidayConfirmation, setShowDeleteHolidayConfirmation] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState(null);
  // Add these state variables with your other useState declarations
  const [holidayCalendarDate, setHolidayCalendarDate] = useState(new Date());
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [selectedDateForHoliday, setSelectedDateForHoliday] = useState(null);
  const [newHolidayName, setNewHolidayName] = useState('');
  // Add this state variable with your other useState declarations:
  const [pendingHolidayHours, setPendingHolidayHours] = useState(null);


  


  function getDefaultWeek() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate the Sunday of this week
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);
    
    // Calculate the Saturday of this week
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(0, 0, 0, 0);
    
    // Format as YYYY-MM-DD in local timezone
    const formatDate = (date) => {
      return date.getFullYear() + '-' + 
            String(date.getMonth() + 1).padStart(2, '0') + '-' + 
            String(date.getDate()).padStart(2, '0');
    };
    
    return {
      start: formatDate(sunday),
      end: formatDate(saturday)
    };
  }

  

  // Get day names for the selected week
  function getWeekDayNames() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Parse the start date properly
    const startParts = selectedWeek.start.split('-');
    const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    
    return days.map((day, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      
      return {
        name: day,
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    });
  }

  
  // Helper functions for date ranges
  function startOfCurrentMonth() {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date.toISOString().split('T')[0];
  }

  function endOfCurrentMonth() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    date.setHours(23, 59, 59, 999);
    return date.toISOString().split('T')[0];
  }

  useEffect(() => {
    if (user?.username) {
      fetch(`${API_URL}/api/moderators/check/${user.username}`)
        .then(res => res.json())
        .then(data => setIsModerator(data.isModerator))
        .catch(err => console.error('Failed to check moderator status:', err));
    }
  }, [user]);

  // Make sure your existing useEffect has proper dependencies
  useEffect(() => {
    fetchProjects();
    if (selectedWeek.start && selectedWeek.end && view !== 'admin-calendar') {
      fetchTimeEntries();
    }
  }, [selectedWeek.start, selectedWeek.end, view]); // Add view dependency


  // Calculate total hours whenever weekly entries change
  useEffect(() => {
    calculateTotalHours();
  }, [weeklyEntries]);

  useEffect(() => {
    const fetchApprovalCounts = async () => {
      if (view === 'approvals' && !selectedProjectId) {
        const approverProjects = projects.filter(project => {
          if (isAdminOnly) return true;
          if (!project.approvers) return false;
          const approversList = project.approvers.split(',').map(email => email.trim());
          return approversList.includes(user.username);
        });
        
        if (approverProjects.length > 0) {
          const projectIds = approverProjects.map(p => p._id);
          const counts = await fetchProjectTimesheetCounts(projectIds);
          setProjectTimesheetCounts(counts);
        }
      }
    };
    
    fetchApprovalCounts();
  }, [view, selectedProjectId, projects, user.username]);

  // Update the fetchProjects function
  // Update the fetchProjects function
  const fetchProjects = async () => {
  try {
    // Fetch all projects first
    const response = await fetch(`${API_URL}/api/projects`);
    const data = await response.json();
    
    // Filter projects based on user role
    let userProjects;
    
    if (isAdminOnly) {
      // ONLY TRUE ADMINS can see all projects
      userProjects = data;
    } else if (isModerator) {
      // MODERATORS can only see projects where they are approvers OR members
      userProjects = data.filter(project => {
        // Check if user is in approvers list
        const approversList = project.approvers ? project.approvers.split(',').map(email => email.trim()) : [];
        const isApprover = approversList.includes(user.username);
        
        // Check if user is in projectMembers list
        const membersList = project.projectMembers ? project.projectMembers.split(',').map(email => email.trim()) : [];
        const isProjectMember = membersList.includes(user.username);
        
        // Include system projects (PTO, Holiday) for everyone
        const isSystemProject = project.isSystemProject;
        
        return isApprover || isProjectMember || isSystemProject;
      });
    } else {
      // REGULAR USERS can only see projects where they are members
      userProjects = data.filter(project => {
        // Check if user is in projectMembers (comma-separated string)
        if (project.projectMembers) {
          const membersList = project.projectMembers.split(',').map(email => email.trim());
          const isProjectMember = membersList.includes(user.username);
          
          // Also include system projects (PTO, Holiday) for everyone
          const isSystemProject = project.isSystemProject;
          
          return isProjectMember || isSystemProject;
        }
        
        // Include system projects even if projectMembers is empty
        return project.isSystemProject;
      });
    }
    
    console.log(`User ${user.username} can see ${userProjects.length} projects out of ${data.length} total`);
    setProjects(userProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
  }
};




const fetchTimeEntries = async () => {
  try {
    // Check if user.id exists before making the request
    if (!user || !user.username) {
      console.error('User ID is missing');
      return;
    }

    // Log what we're sending to help debug
    console.log('Fetching time entries with params:', {
      employeeName: user.username,
      weekStart: selectedWeek.start,
      weekEnd: selectedWeek.end
    });

    const response = await fetch(
      `${API_URL}/api/timeentries?employeeEmail=${user.username}&weekStart=${selectedWeek.start}&weekEnd=${selectedWeek.end}`
    );

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    
    // Verify data is an array
    if (!Array.isArray(data)) {
      console.error('Expected array response, got:', data);
      setTimeEntries([]);
      return;
    }
    
    setTimeEntries(data);
    formatWeeklyEntries(data);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    setTimeEntries([]);
    setWeeklyEntries([]);
  }
};


  const formatWeeklyEntries = (entries) => {
    // Check if entries is an array before trying to map
    if (!Array.isArray(entries)) {
      console.error('Expected entries to be an array, got:', entries);
      setWeeklyEntries([]);
      return;
    }
    const formattedEntries = entries.map(entry => {
      const days = {};
      entry.dayEntries.forEach(day => {
        const dayOfWeek = new Date(day.date).getDay();
        const dayName = getDayNameFromIndex(dayOfWeek);
        days[dayName.toLowerCase()] = day.hours;
      });
      
      return {
        id: entry._id,
        projectId: entry.projectId,
        projectName: projects.find(p => p._id === entry.projectId)?.projectName || 'Unknown Project',
        isBillable: entry.isBillable,
        ...days
      };
    });
    
    setWeeklyEntries(formattedEntries);
  };

  const getDayNameFromIndex = (index) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[index];
  };

  const calculateTotalHours = () => {
    const totals = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0,
      total: 0
    };
    
    weeklyEntries.forEach(entry => {
      totals.monday += Number(entry.monday || 0);
      totals.tuesday += Number(entry.tuesday || 0);
      totals.wednesday += Number(entry.wednesday || 0);
      totals.thursday += Number(entry.thursday || 0);
      totals.friday += Number(entry.friday || 0);
      totals.saturday += Number(entry.saturday || 0);
      totals.sunday += Number(entry.sunday || 0);
    });
    
    totals.total = totals.monday + totals.tuesday + totals.wednesday + 
                   totals.thursday + totals.friday + totals.saturday + totals.sunday;
    
    setTotalHours(totals);
  };

  const handleCreateProject = async () => {
    try {
      setIsCreatingProject(true);
      
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newProject,
          createdBy: user.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const data = await response.json();
      setProjects(prevProjects => [...prevProjects, data]);
      
      // Success - close modal and reset form
      setShowCreateProjectConfirmation(false);
      resetNewProjectForm();
      setView('list');
      
    } catch (error) {
      console.error('Error creating project:', error);
      // You could show an error modal here instead of just logging
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Create a function to show the confirmation modal
  const handleCreateProjectClick = () => {
    // Validate required fields
    if (!newProject.projectName || !newProject.clientName ||
        !newProject.dateRange.start || !newProject.dateRange.end ||
        !newProject.maxHours || !newProject.maxBudget ||
        !newProject.approvers || !newProject.projectMembers) {
      // Could show an error modal here instead of just returning
      return;
    }
    
    setShowCreateProjectConfirmation(true);
  };


  const resetNewProjectForm = () => {
    setNewProject({
      projectName: '',
      clientName: '',
      projectType: '',
      poNumber: '',
      contractNumber: '',
      dateRange: {
        start: '',
        end: ''
      },
      maxHours: '',
      maxBudget: '',
      approvers: '',
      projectMembers: '',
      location: '',
      isHybrid: false
    });
  };


  // Add these functions before your return statement

  // Function to get editable projects based on user role
  const getEditableProjects = () => {
    if (isAdminOnly) {
      // True admins can see all projects
      return projects;
    } else if (isModerator) {
      // Moderators can only see projects they're approvers or members of
      return projects.filter(project => {
        const approversList = project.approvers ? project.approvers.split(',').map(email => email.trim()) : [];
        const membersList = project.projectMembers ? project.projectMembers.split(',').map(email => email.trim()) : [];
        
        return approversList.includes(user.username) || membersList.includes(user.username);
      });
    } else {
      // Regular users can't edit projects
      return [];
    }
  };

  // Function to start editing a project
  const handleEditProject = (project) => {
    setEditingProject(project);
    setEditProjectForm({
      projectName: project.projectName,
      clientName: project.clientName,
      projectType: project.projectType,
      poNumber: project.poNumber || '',
      contractNumber: project.contractNumber || '',
      dateRange: {
        start: project.dateRange.start.split('T')[0],
        end: project.dateRange.end.split('T')[0]
      },
      maxHours: project.maxHours,
      maxBudget: project.maxBudget,
      approvers: project.approvers,
      projectMembers: project.projectMembers,
      location: project.location || '',
      isHybrid: project.isHybrid,
      isActive: project.isActive
    });
    setView('edit-project');
  };

  // Function to show confirmation modal
  const handleEditProjectClick = () => {
    // Validate required fields
    if (!editProjectForm.projectName || !editProjectForm.clientName ||
        !editProjectForm.dateRange.start || !editProjectForm.dateRange.end ||
        !editProjectForm.maxHours || !editProjectForm.maxBudget ||
        !editProjectForm.approvers || !editProjectForm.projectMembers) {
      alert('Please fill in all required fields');
      return;
    }
    
    setShowEditProjectConfirmation(true);
  };

  // Function to actually update the project
  const handleUpdateProject = async () => {
    try {
      setIsUpdatingProject(true);
      
      const response = await fetch(`${API_URL}/api/projects/${editingProject._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editProjectForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update project');
      }

      const updatedProject = await response.json();
      
      // Update the projects list
      setProjects(prevProjects => 
        prevProjects.map(project => 
          project._id === editingProject._id ? updatedProject : project
        )
      );
      
      // Success - close modal and reset form
      setShowEditProjectConfirmation(false);
      setEditingProject(null);
      setEditProjectForm({
        projectName: '',
        clientName: '',
        projectType: '',
        poNumber: '',
        contractNumber: '',
        dateRange: { start: '', end: '' },
        maxHours: '',
        maxBudget: '',
        approvers: '',
        projectMembers: '',
        location: '',
        isHybrid: false,
        isActive: true
      });
      setView('manage-projects');
      
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project: ' + error.message);
    } finally {
      setIsUpdatingProject(false);
    }
  };


  

  const handleAddTimeEntry = () => {
    if (!selectedProjectId) return;
    
    const newEntryId = `temp-${Date.now()}`;
    const newEntry = {
      id: newEntryId,
      projectId: selectedProjectId,
      projectName: projects.find(p => p._id === selectedProjectId)?.projectName || 'Unknown Project',
      isBillable,
      monday: dayHours.monday || 0,
      tuesday: dayHours.tuesday || 0,
      wednesday: dayHours.wednesday || 0,
      thursday: dayHours.thursday || 0,
      friday: dayHours.friday || 0,
      saturday: dayHours.saturday || 0,
      sunday: dayHours.sunday || 0,
      comments: '' // Will be filled when user adds comments
    };
    
    setWeeklyEntries([...weeklyEntries, newEntry]);
    
    // Set this timesheet as active for comments
    setActiveTimesheetForComments(newEntryId);
    
    // Reset form but keep comments section for this timesheet
    setSelectedProjectId('');
    setIsBillable(true);
    setDayHours({
      monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
      friday: 0, saturday: 0, sunday: 0
    });
    // Don't clear weekComments - user will add comments for this timesheet
  };


  const handleSubmitTimesheet = async () => {
    try {
      setIsSubmittingTimesheet(true);
      
      // Convert weekly entries to the format expected by the API
      const timeEntriesToSubmit = weeklyEntries
        .filter(entry => {
          // Only include entries with hours > 0
          const hasHours = entry.monday > 0 || entry.tuesday > 0 || entry.wednesday > 0 || 
                          entry.thursday > 0 || entry.friday > 0 || entry.saturday > 0 || 
                          entry.sunday > 0;
          return hasHours;
        })
        .map(entry => {
        const dayEntries = [];
        const weekStartParts = selectedWeek.start.split('-');
        const weekStart = new Date(weekStartParts[0], weekStartParts[1] - 1, weekStartParts[2]);
        
        console.log('=== SUBMISSION DEBUG ===');
        console.log('selectedWeek.start:', selectedWeek.start);
        console.log('weekStart object:', weekStart);
        
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        daysOfWeek.forEach((day, index) => {
          const hours = Number(entry[day] || 0);
          if (hours > 0) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + index);
            
            console.log(`${day} (index ${index}):`, {
              hours: hours,
              calculatedDate: date,
              dateString: date.toISOString().split('T')[0]
            });
            
            dayEntries.push({
              date: date.toISOString(),
              hours: hours,
              notes: ''
            });
          }
        });
        
        console.log('========================');
          
          return {
            employeeId: user.id,
            employeeName: user.username,
            projectId: entry.projectId,
            weekStartDate: selectedWeek.start,
            weekEndDate: selectedWeek.end,
            isBillable: entry.isBillable,
            dayEntries,
            totalHours: dayEntries.reduce((sum, day) => sum + day.hours, 0),
            status: 'submitted',
            submittedDate: new Date().toISOString(),
            comments: entry.comments || ''
          };
        });
      
      console.log('Submitting timesheet entries:', timeEntriesToSubmit);
      
      if (timeEntriesToSubmit.length === 0) {
        setIsSubmittingTimesheet(false);
        // You could show an error modal here instead of alert
        return;
      }
      
      // Submit all time entries
      const response = await fetch(`${API_URL}/api/timeentries/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(timeEntriesToSubmit)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit timesheet');
      }
      
      await response.json();
      
      // Success - close modal and refresh
      setShowSubmitConfirmation(false);
      fetchTimeEntries();
      setWeekComments('');
      
      // You could show a success modal here instead of alert
      
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      // You could show an error modal here instead of alert
    } finally {
      setIsSubmittingTimesheet(false);
    }
  };

  // Create a function to show the confirmation modal
  const handleSubmitClick = () => {
    // Check if there are entries to submit
    const hasEntries = weeklyEntries.some(entry => {
      return entry.monday > 0 || entry.tuesday > 0 || entry.wednesday > 0 || 
            entry.thursday > 0 || entry.friday > 0 || entry.saturday > 0 || 
            entry.sunday > 0;
    });
    
    if (!hasEntries) {
      // Show error modal instead of alert
      return;
    }
    
    setShowSubmitConfirmation(true);
  };
  

  const handleDeleteEntry = (entryId) => {
    setWeeklyEntries(weeklyEntries.filter(entry => entry.id !== entryId));
  };

  const handlePreviousWeek = () => {
    const startDate = new Date(selectedWeek.start);
    startDate.setDate(startDate.getDate() - 7);
    
    const endDate = new Date(selectedWeek.end);
    endDate.setDate(endDate.getDate() - 7);
    
    setSelectedWeek({
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    });
  };

  
  const handleNextWeek = () => {
    const startDate = new Date(selectedWeek.start);
    startDate.setDate(startDate.getDate() + 7);
    
    const endDate = new Date(selectedWeek.end);
    endDate.setDate(endDate.getDate() + 7);
    
    setSelectedWeek({
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    });
  };

  // Add this function to save comments to the active timesheet
  const handleSaveComments = () => {
    if (!activeTimesheetForComments || !weekComments.trim()) return;
    
    // Update the timesheet with comments
    const updatedEntries = weeklyEntries.map(entry => 
      entry.id === activeTimesheetForComments 
        ? { ...entry, comments: weekComments }
        : entry
    );
    
    setWeeklyEntries(updatedEntries);
    
    // Clear the comments and active timesheet
    setWeekComments('');
    setActiveTimesheetForComments(null);
  };



  // Add this function to check if user is an approver
  const isUserAnApprover = (user, projects) => {
    if (!user || !user.username) return false;
    
    return projects.some(project => {
      if (!project.approvers) return false;
      const approversList = project.approvers.split(',').map(email => email.trim());
      return approversList.includes(user.username);
    });
  };

  // Add this function to fetch timesheets for a project
  const handleViewProjectTimesheets = async (projectId) => {
    try {
      // Simplify the request - don't use date parameters if they're causing issues
      const response = await fetch(`${API_URL}/api/timeentries/project/${projectId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Fetched project timesheets:', data);
      console.log('Full timesheet object:', JSON.stringify(data[0], null, 2));
      
      // Initialize the status updates with existing data
      const initialStatusUpdates = {};
      data.forEach(timesheet => {
        initialStatusUpdates[timesheet._id] = {
          status: timesheet.status,
          approvalComments: timesheet.approvalComments || '' // Changed from 'comments' to 'approvalComments'
        };
      });
      
      setTimesheetStatusUpdates(initialStatusUpdates);
      setSelectedProjectTimesheets(data);
      setSelectedProjectId(projectId);
    } catch (error) {
      console.error('Error fetching project timesheets:', error);
      setSelectedProjectTimesheets([]);
    }
  };

  // Add these memoized handlers to prevent recreation on every render
  const handleExpandTimesheet = useCallback((timesheetId) => {
    setExpandedTimesheet(expandedTimesheet === timesheetId ? null : timesheetId);
  }, [expandedTimesheet]);

  const handleBackToProjects = useCallback(() => {
    setSelectedHistoryProjectId(null);
    setUserHistoryTimesheets([]);
  }, []);

  const handleBackToList = useCallback(() => {
    setView('list');
  }, []);

  const handleViewTimesheets = useCallback((projectId) => {
    fetchUserProjectTimesheets(projectId);
  }, []);

  const handleBackToProjectsFromApprovals = useCallback(() => {
    setSelectedProjectId(null);
  }, []);

  // Fetch holidays from server
  const fetchHolidays = async () => {
    try {
      const response = await fetch(`${API_URL}/api/holidays`);
      if (response.ok) {
        const data = await response.json();
        console.log('Holidays fetched:', data);
        setHolidays(data);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  // Check if a date is a holiday
  const isHoliday = (date) => {
    const dateString = date.getFullYear() + '-' + 
                      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(date.getDate()).padStart(2, '0');
    
    return holidays.find(h => h.date === dateString);
  };

  // Toggle holiday status (for admins only)
  // Update the toggleHoliday function to remove the prompt
  const toggleHoliday = async (date) => {
    const dateString = date.getFullYear() + '-' + 
                      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(date.getDate()).padStart(2, '0');
    
    const existingHoliday = holidays.find(h => h.date === dateString);
    
    try {
      if (existingHoliday) {
        // Remove holiday
        const response = await fetch(`${API_URL}/api/holidays/${dateString}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          setHolidays(holidays.filter(h => h.date !== dateString));
          console.log('Holiday removed for:', dateString);
        }
      } else {
        // For adding holidays, you'll need a proper form instead of prompt
        // We can implement this later if needed
        console.log('Adding holidays requires a proper form');
      }
    } catch (error) {
      console.error('Error toggling holiday:', error);
    }
  };


  // Check for holiday conflicts when adding hours
  const checkHolidayConflict = (dayName, hours) => {
    if (hours <= 0) return true; // No hours, no conflict

    // Skip holiday warning if Holiday project is selected
    if (selectedProjectId === 'holiday') {
      return true;
    }
    
    // Also skip if it's a system project marked as holiday
    const selectedProject = projects.find(p => p._id === selectedProjectId);
    if (selectedProject && selectedProject.projectName && 
        selectedProject.projectName.toLowerCase().includes('holiday')) {
      return true;
    }
    
    // Calculate the date for this day
    const weekStartParts = selectedWeek.start.split('-');
    const weekStart = new Date(weekStartParts[0], weekStartParts[1] - 1, weekStartParts[2]);
    
    const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName.toLowerCase());
    const targetDate = new Date(weekStart);
    targetDate.setDate(weekStart.getDate() + dayIndex);
    
    const holiday = isHoliday(targetDate);
    
    if (holiday) {
      setHolidayWarningDetails({
        day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        date: targetDate.toLocaleDateString(),
        holidayName: holiday.name,
        hours: hours,
        dayName: dayName 
      });
      setShowHolidayWarning(true);
      return false; // Block the input
    }
    
    return true; // Allow the input
  };

  

  // Add useEffect to fetch holidays when component mounts
  useEffect(() => {
    fetchHolidays();
  }, []);

  // Add these functions before your return statement

  // Calendar helper functions for holiday management
  const getHolidayCalendarDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatHolidayCalendarMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isDateHoliday = (date) => {
    if (!date) return false;
    const dateString = date.getFullYear() + '-' + 
                      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(date.getDate()).padStart(2, '0');
    return holidays.find(h => h.date === dateString);
  };

  const handleCalendarDateClick = (date) => {
    if (!date) return;
    
    const existingHoliday = isDateHoliday(date);
    
    if (existingHoliday) {
      // If it's already a holiday, ask to remove it
      setHolidayToDelete(existingHoliday);
      setShowDeleteHolidayConfirmation(true);
    } else {
      // If it's not a holiday, ask to add one
      setSelectedDateForHoliday(date);
      setShowAddHolidayModal(true);
    }
  };

  const handleAddHoliday = async () => {
    if (!selectedDateForHoliday || !newHolidayName.trim()) return;
    
    const dateString = selectedDateForHoliday.getFullYear() + '-' + 
                      String(selectedDateForHoliday.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(selectedDateForHoliday.getDate()).padStart(2, '0');
    
    try {
      const response = await fetch(`${API_URL}/api/holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: dateString,
          name: newHolidayName.trim(),
          createdBy: user.username || user.name || 'Admin'
        })
      });
      
      if (response.ok) {
        const newHoliday = await response.json();
        setHolidays([...holidays, newHoliday]);
        console.log('Holiday added for:', dateString);
        
        // Close modal and reset
        setShowAddHolidayModal(false);
        setSelectedDateForHoliday(null);
        setNewHolidayName('');
      } else {
        const error = await response.json();
        alert('Failed to add holiday: ' + error.error);
      }
    } catch (error) {
      console.error('Error adding holiday:', error);
      alert('Failed to add holiday');
    }
  };




  // Add these component functions
  const ApprovalsView = () => {
    // Get projects where user is an approver
    const approverProjects = projects.filter(project => {
      if (isAdminOnly) return true;
      if (!project.approvers) return false;
      const approversList = project.approvers.split(',').map(email => email.trim());
      return approversList.includes(user.username);
    });
  };

  const ProjectTimesheetsView = () => {
    const project = projects.find(p => p._id === selectedProjectId);
    
    if (!project) return <p>Project not found</p>;
    
    // Group timesheets by employee
    const timesheetsByEmployee = {};
    selectedProjectTimesheets.forEach(timesheet => {
      if (!timesheetsByEmployee[timesheet.employeeName]) {
        timesheetsByEmployee[timesheet.employeeName] = [];
      }
      timesheetsByEmployee[timesheet.employeeName].push(timesheet);
    });
  };

  const weekDays = getWeekDayNames();

  // First, add this function before your return statement
  const handleTimesheetStatusUpdate = async (timesheetId, newStatus) => {
    try {
      // Add a reason prompt if denying
      let reason = '';
      if (newStatus === 'denied') {
        reason = prompt('Please provide a reason for denial:');
        if (!reason) return; // Cancel if no reason provided
      }

      const response = await fetch(`${API_URL}/api/timeentries/${timesheetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          comments: reason, // Save reason in the comments field
          reason: reason,   // Also keep the original reason field for compatibility
          approverEmail: user.username
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const updatedTimesheet = await response.json();
      
      // Update the local state with the updated timesheet
      setSelectedProjectTimesheets(
        selectedProjectTimesheets.map(timesheet => 
          timesheet._id === timesheetId ? updatedTimesheet : timesheet
        )
      );
      
      alert(`Timesheet ${newStatus === 'approved' ? 'approved' : 'denied'} successfully!`);
    } catch (error) {
      console.error('Error updating timesheet status:', error);
      alert('Failed to update timesheet status');
    }
  };


  const handleSubmitTimesheetDecision = async (timesheetId) => {
    const update = timesheetStatusUpdates[timesheetId];
    if (!update) return;
    
    // Set up the pending decision for confirmation
    setPendingDecision({
      timesheetId,
      update,
      timesheet: selectedProjectTimesheets.find(t => t._id === timesheetId)
    });
    setShowDecisionConfirmation(true);
  };


  const handleConfirmedDecision = async () => {
    setShowDecisionConfirmation(false);
    setIsProcessingDecision(true);
    
    const { timesheetId, update } = pendingDecision;
    
    try {
      const response = await fetch(`${API_URL}/api/timeentries/${timesheetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: update.status,
          comments: update.approvalComments,
          approverEmail: user.username,
          approvedDate: new Date().toISOString()
        })
      });

      if (response.ok) {
        const updatedTimesheet = await response.json();
        
        // Clear selections and go back to main view
        setSelectedProjectId(null);
        setSelectedProjectTimesheets([]);
        setTimesheetStatusUpdates({});
        setView('list'); // Go back to main timesheet view
      }
    } catch (error) {
      console.error('Error updating timesheet status:', error);
      alert('Failed to update timesheet status');
    } finally {
      setIsProcessingDecision(false);
    }
    
    setPendingDecision(null);
  };


  // Fetch projects that user has submitted timesheets for
  const fetchUserHistoryProjects = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/timeentries/user-projects/${user.username}`);
      const data = await response.json();
      setUserHistoryProjects(data);
    } catch (error) {
      console.error('Error fetching user history projects:', error);
    }
  }, [user.username]); // Remove API_URL from dependencies

  const fetchUserProjectTimesheets = useCallback(async (projectId) => {
    try {
      const response = await fetch(`${API_URL}/api/timeentries/user-project/${user.username}/${projectId}`);
      const data = await response.json();
      setUserHistoryTimesheets(data);
      setSelectedHistoryProjectId(projectId);
    } catch (error) {
      console.error('Error fetching user project timesheets:', error);
    }
  }, [user.username]); // Remove API_URL from dependencies

  const validateDayHours = (day, newHours) => {
    
  // Calculate existing hours for this day across all projects
  const existingDayTotal = weeklyEntries.reduce((total, entry) => {
    return total + (Number(entry[day.toLowerCase()] || 0));
  }, 0);
  
  const totalHours = existingDayTotal + Number(newHours);
  
    if (totalHours > 8) {
      setHourLimitDetails({
        day: day.charAt(0).toUpperCase() + day.slice(1),
        hours: newHours,
        dayTotal: totalHours
      });
      setShowHourLimitModal(true);
      return false;
    }
    
    return true;
  };


  


  const fetchProjectTimesheetCounts = async (projectIds) => {
    try {
      const counts = {};
      
      // Fetch counts for each project
      await Promise.all(
        projectIds.map(async (projectId) => {
          const response = await fetch(`${API_URL}/api/timeentries/project/${projectId}?status=submitted`);
          if (response.ok) {
            const timesheets = await response.json();
            counts[projectId] = timesheets.length;
          } else {
            counts[projectId] = 0;
          }
        })
      );
      
      return counts;
    } catch (error) {
      console.error('Error fetching timesheet counts:', error);
      return {};
    }
  };

  // Add calendar helper functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Add API functions for calendar data
  const fetchCalendarData = async (targetDate = calendarDate) => {
    try {
      setIsLoadingCalendarData(true); // Add loading state
      
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      console.log(`Fetching calendar data for ${year}-${month + 1}`); // Debug log
      
      const response = await fetch(`${API_URL}/api/admin/calendar-data?startDate=${startDate}&endDate=${endDate}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch calendar data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Calendar data received for ${year}-${month + 1}:`, data); // Debug log
      
      setCalendarData(data);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setCalendarData({}); // Clear data on error
    } finally {
      setIsLoadingCalendarData(false); // Remove loading state
    }
  };


  const fetchDayDetails = async (date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await fetch(`${API_URL}/api/admin/day-details?date=${dateStr}`);
      const data = await response.json();
      setSelectedDayData(data);
      setSelectedDay(date);
    } catch (error) {
      console.error('Error fetching day details:', error);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      console.log('Fetching all employees...');
      const response = await fetch(`${API_URL}/api/admin/employees`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      console.log('All employees received:', data);
      
      setAllEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setAllEmployees([]);
    }
  };

  // Update your fetchEmployeeData function to add more logging
  const fetchEmployeeData = async (employeeName, range = 'month', status = 'all') => {
    try {
      setIsLoadingEmployeeData(true); // Show loading
      console.log(`Fetching employee data for ${employeeName} with range ${range} and status ${status}`);

      console.log('=== FETCH EMPLOYEE DATA DEBUG ===');
      console.log('Range:', range);
      console.log('Calendar Date:', calendarDate);
      console.log('Calendar Month:', calendarDate.getMonth());
      console.log('Calendar Year:', calendarDate.getFullYear());
      console.log('Current Date:', new Date());
      console.log('Current Month:', new Date().getMonth());
      
      let url = `${API_URL}/api/admin/employee-data?employee=${encodeURIComponent(employeeName)}&range=${range}&status=${status}`;
      
      if (range === 'calendar-month') {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        url += `&year=${year}&month=${month}`;
        console.log('CALENDAR-MONTH URL:', url);
      }
      
      console.log('Final URL:', url);
      console.log('===================================');

      
    
      
      const response = await fetch(`${API_URL}/api/admin/employee-data?employee=${encodeURIComponent(employeeName)}&range=${range}&status=${status}`);
      console.log('API URL:', `${API_URL}/api/admin/employee-data?employee=${encodeURIComponent(employeeName)}&range=${range}&status=${status}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Employee data received:', data);
      
      setEmployeeData(data);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      setEmployeeData([]);
    } finally {
      setIsLoadingEmployeeData(false); // Hide loading
    }
  };


  // Update this function in your TimeTableManager component
  const fetchProjectData = async (projectId, range = 'month', status = 'all') => {
    try {
      setIsLoadingProjectData(true); // Show loading
      console.log(`Fetching project data for ${projectId} with range ${range} and status ${status}`);

      let url = `${API_URL}/api/admin/project-data?projectId=${projectId}&range=${range}&status=${status}`;
    
      // Add calendar month parameters
      if (range === 'calendar-month') {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        url += `&year=${year}&month=${month}`;
      }

       
      
      const response = await fetch(`${API_URL}/api/admin/project-data?projectId=${projectId}&range=${range}&status=${status}`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Project data received:', data);
      
      setProjectData(data);
    } catch (error) {
      console.error('Error fetching project data:', error);
      setProjectData([]);
    } finally {
      setIsLoadingProjectData(false); // Hide loading
    }
  };

  // Add debouncing to prevent rapid API calls
    const debounce = (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    };

    // Create debounced versions of your fetch functions
    const debouncedFetchEmployeeData = debounce(fetchEmployeeData, 300);
    const debouncedFetchProjectData = debounce(fetchProjectData, 300);



  // Add useEffect for calendar data
  useEffect(() => {
    if (view === 'admin-calendar') {
      fetchAllEmployees();
      fetchCalendarData(); // Also fetch calendar data once
    }
  }, [view]);

  // Day Details Modal Component
  const DayDetailsModal = ({ selectedDay, selectedDayData, onClose }) => {
    if (!selectedDay) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Details for {selectedDay.toLocaleDateString()}</h3>
            <button className="modal-close-button" onClick={onClose}>×</button>
          </div>
          
          <div className="modal-body">
            {selectedDayData.length === 0 ? (
              <p>No hours logged for this day</p>
            ) : (
              <div className="day-breakdown">
                <div className="day-summary">
                  <strong>Total Hours: {selectedDayData.reduce((sum, entry) => sum + entry.totalHours, 0)}</strong>
                </div>
                
                {selectedDayData.map((entry, index) => (
                  <div key={index} className="employee-day-entry-modal">
                    <div className="employee-header">
                      <strong>{entry.employeeName}</strong>
                      <span className="employee-total">{entry.totalHours}h</span>
                    </div>
                    <div className="project-breakdown">
                      {entry.projects.map((project, pIndex) => (
                        <div key={pIndex} className="project-hours">
                          <span className="project-name">{project.projectName}</span>
                          <span className="project-hours-value">{project.hours}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getPaginatedProjects = (projects) => {
    const startIndex = (currentProjectPage - 1) * projectsPerPage;
    const endIndex = startIndex + projectsPerPage;
    return projects.slice(startIndex, endIndex);
  };

  const getPaginatedTimesheets = (timesheets) => {
    const startIndex = (currentTimesheetPage - 1) * timesheetsPerPage;
    const endIndex = startIndex + timesheetsPerPage;
    return timesheets.slice(startIndex, endIndex);
  };

  const getPaginatedHistoryProjects = (projects) => {
    const startIndex = (currentHistoryProjectPage - 1) * historyProjectsPerPage;
    const endIndex = startIndex + historyProjectsPerPage;
    return projects.slice(startIndex, endIndex);
  };

  const getPaginatedHistoryTimesheets = (timesheets) => {
    const startIndex = (currentHistoryTimesheetPage - 1) * historyTimesheetsPerPage;
    const endIndex = startIndex + historyTimesheetsPerPage;
    return timesheets.slice(startIndex, endIndex);
  };




  const handleSubmitBatchDecisions = async () => {
    if (selectedTimesheets.length === 0) return;
    
    setShowBatchConfirmation(true);
  };

  const handleConfirmedBatchDecisions = async () => {
    setShowBatchConfirmation(false);
    setIsProcessingDecision(true);
    
    try {
      const updatePromises = selectedTimesheets.map(timesheetId => {
        const updates = timesheetStatusUpdates[timesheetId];
        return fetch(`${API_URL}/api/timeentries/${timesheetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: updates.status,
            comments: updates.approvalComments,
            approverEmail: user.username,
            approvedDate: new Date()
          })
        });
      });
      
      await Promise.all(updatePromises);
      
      // Clear all selections and go back to main view
      setSelectedTimesheets([]);
      setSelectedProjectId(null);
      setSelectedProjectTimesheets([]);
      setTimesheetStatusUpdates({});
      setView('list'); // Go back to main timesheet view
      
    } catch (error) {
      console.error('Failed to submit batch decisions:', error);
      alert('Failed to submit decisions. Please try again.');
    } finally {
      setIsProcessingDecision(false);
    }
  };





  // Project Details Modal Component
  const ProjectDetailsModal = ({ project, onClose }) => {
    if (!project) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Project Details</h2>
            <button className="modal-close-btn" onClick={onClose}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="project-details-grid">
              <div className="detail-row">
                <span className="detail-label">Project Name:</span>
                <span className="detail-value">{project.projectName}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Client Name:</span>
                <span className="detail-value">{project.clientName}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Project Type:</span>
                <span className="detail-value">{project.projectType}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">PO Number:</span>
                <span className="detail-value">{project.poNumber || 'N/A'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Contract Number:</span>
                <span className="detail-value">{project.contractNumber || 'N/A'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Date Range:</span>
                <span className="detail-value">
                  {new Date(project.dateRange.start).toLocaleDateString('en-US', { timeZone: 'UTC' })} - 
                  {new Date(project.dateRange.end).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                </span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Max Hours:</span>
                <span className="detail-value">{project.maxHours} hrs</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Max Budget:</span>
                <span className="detail-value">${project.maxBudget?.toLocaleString() || 'N/A'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Total Hours Used:</span>
                <span className="detail-value">{project.projectTotalHours || 0} hrs</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Total Billed Hours:</span>
                <span className="detail-value">{project.projectTotalBilledHours || 0} hrs</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Location:</span>
                <span className="detail-value">{project.location || 'N/A'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Is Hybrid:</span>
                <span className="detail-value">{project.isHybrid ? 'Yes' : 'No'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Approvers:</span>
                <span className="detail-value">{project.approvers || 'N/A'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Project Members:</span>
                <span className="detail-value">{project.projectMembers || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button className="modal-close-button" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  };





  // Add the Calendar Dashboard component
  // Add the Calendar Dashboard component
  const AdminCalendarDashboard = () => {
    

    const days = getDaysInMonth(calendarDate);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const handlePrevMonth = () => {
      const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
      setCalendarDate(newDate);
      fetchCalendarData(newDate); // Add this line
    };

    const handleNextMonth = () => {
      const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
      setCalendarDate(newDate);
      fetchCalendarData(newDate); // Add this line
    };

    
    const handleDayClick = (date) => {
      if (date) {
        fetchDayDetails(date);
      }
    };
    
    const handleEmployeeSelect = (employeeName) => {
      console.log('Employee selected:', employeeName);
      setSelectedEmployee(employeeName);
      if (employeeName) {
        fetchEmployeeData(employeeName, employeeTimeRange, employeeStatusFilter);
      } else {
        setEmployeeData([]);
      }
    };
    
    const handleProjectSelect = (projectId) => {
      setSelectedProject(projectId);
      if (projectId) {
        fetchProjectData(projectId, projectTimeRange, projectStatusFilter);
      } else {
        setProjectData([]);
      }
    };





    const handleCloseModal = () => {
      setSelectedDay(null);
      setSelectedDayData([]);
    };
    
    return (
      <div className="admin-calendar-container">
        <h2>Admin Calendar Dashboard</h2>
        
        <button 
          className="back-button"
          onClick={() => setView('list')}
        >
          ← Back to Timesheet
        </button>
        
        <div className="calendar-dashboard">
          {/* Left Side - Calendar */}
          <div className="calendar-section">
            <div className="calendar-header">
              <button onClick={handlePrevMonth}>‹</button>
              <h3>{formatMonthYear(calendarDate)}</h3>
              <button onClick={handleNextMonth}>›</button>
            </div>
            
            <div className="calendar-grid">
              {/* Day headers */}
              {dayNames.map(day => (
                <div key={day} className="calendar-day-header">{day}</div>
              ))}
              
              {/* Calendar days */}
              {days.map((date, index) => (
                <div
                  key={index}
                  className={`calendar-day ${date ? 'active' : 'inactive'}`}
                  onClick={() => handleDayClick(date)}
                >
                  {date && (
                    <>
                      <div className="day-number">{date.getDate()}</div>
                      <div className="day-hours">
                        {isLoadingCalendarData ? (
                          <span className="loading-dots">⏳</span>
                        ) : (
                          `${calendarData[date.toISOString().split('T')[0]]?.totalHours || 0}h`
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Right Side - Employee/Project Panel */}
          <div className="info-panel">
            <div className="panel-tabs">
              <button 
                className={rightPanelView === 'employee' ? 'active' : ''}
                onClick={() => setRightPanelView('employee')}
              >
                Employee View
              </button>
              <button 
                className={rightPanelView === 'project' ? 'active' : ''}
                onClick={() => setRightPanelView('project')}
              >
                Project View
              </button>
            </div>
            
            {rightPanelView === 'employee' ? (
              <div className="employee-panel">
                <h4>Employee Hours</h4>
                
                <div className="employee-selector">
                  <select 
                    value={selectedEmployee} 
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                  >
                    <option value="">Select Employee</option>
                    {allEmployees.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="time-range-selector">
                  <label>Time Range:</label>
                  <select 
                      value={employeeTimeRange} 
                      onChange={(e) => {
                        setEmployeeTimeRange(e.target.value);
                        if (selectedEmployee) {
                          fetchEmployeeData(selectedEmployee, e.target.value, employeeStatusFilter);
                        }
                      }}
                  >
                    <option value="week">This Week</option>
                    <option value="2weeks">Last 2 Weeks</option>
                    <option value="month">This Month</option>
                    
                  </select>
                </div>

                <div className="status-filter-selector">
                  <label>Status Filter:</label>
                  <select 
                    value={employeeStatusFilter} 
                    onChange={(e) => {
                      setEmployeeStatusFilter(e.target.value);
                      if (selectedEmployee) {
                        debouncedFetchEmployeeData(selectedEmployee, employeeTimeRange, e.target.value);
                      }
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="denied">Denied</option>
                  </select>
                </div>
                
                {selectedEmployee && (
                  <div className="employee-data">
                    <h5>{selectedEmployee} - {employeeTimeRange}</h5>
                    {isLoadingEmployeeData ? (
                      <div className="loading-indicator">
                        <div className="processing-spinner">⏳</div>
                        <p>Loading employee data...</p>
                      </div>
                    ) : (
                      employeeData.length > 0 ? (
                        <>
                          <div className="total-hours">
                            Total Hours: {employeeData.reduce((sum, entry) => sum + entry.totalHours, 0)}
                          </div>
                          {employeeData.map((entry, index) => (
                            <div key={index} className="employee-entry">
                              <div className="project-name">{entry.projectName}</div>
                              <div className="hours">{entry.totalHours}h</div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p>No hours found for this employee in the selected time range.</p>
                      )
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="project-panel">
                <h4>Project Hours</h4>
                
                <div className="project-selector">
                  <select 
                    value={selectedProject} 
                    onChange={(e) => handleProjectSelect(e.target.value)}
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project._id} value={project._id}>{project.projectName}</option>
                    ))}
                  </select>
                </div>

                <div className="time-range-selector">
                  <label>Time Range:</label>
                  <select 
                    value={projectTimeRange} 
                    onChange={(e) => {
                      setProjectTimeRange(e.target.value);
                      if (selectedProject) {
                        fetchProjectData(selectedProject, e.target.value, projectStatusFilter);
                      }
                    }}
                  >
                    <option value="week">This Week</option>
                    <option value="2weeks">Last 2 Weeks</option>
                    <option value="month">This Month</option>
                    
                  </select>
                </div>

                <div className="status-filter-selector">
                  <label>Status Filter:</label>
                  <select 
                    value={projectStatusFilter} 
                    onChange={(e) => {
                      setProjectStatusFilter(e.target.value);
                      if (selectedProject) {
                        debouncedFetchProjectData(selectedProject, projectTimeRange, e.target.value);
                      }
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="denied">Denied</option>
                  </select>
                </div>
                
                {selectedProject && (
                  <div className="project-data">
                    <h5>{projects.find(p => p._id === selectedProject)?.projectName} - {projectTimeRange}</h5>
                    {isLoadingProjectData ? (
                      <div className="loading-indicator">
                        <div className="processing-spinner">⏳</div>
                        <p>Loading project data...</p>
                      </div>
                    ) : (
                      projectData.length > 0 ? (
                        <>
                          <div className="total-hours">
                            Total Hours: {projectData.reduce((sum, entry) => sum + entry.totalHours, 0)}
                          </div>
                          {projectData.map((entry, index) => (
                            <div key={index} className="project-entry">
                              <div className="employee-name">{entry.employeeName}</div>
                              <div className="hours">{entry.totalHours}h</div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p>No hours found for this project in the selected time range.</p>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Day Details Modal */}
        <DayDetailsModal 
          selectedDay={selectedDay}
          selectedDayData={selectedDayData}
          onClose={handleCloseModal}
        />
      </div>
    );
  };






// Now update the return statement
return (
  <div className="timetable-container">
    {view === 'list' ? (
      <div className="timesheet-view">
        <div className="header-buttons">
          <button
            className="home-button"
            onClick={onBack}
          >
            Home
          </button>
          {isAdmin && (
            <button
              className="create-project-button"
              onClick={() => setView('new-project')}
            >
              Create New Project
            </button>
          )}
           {(isAdminOnly || isModerator) && (
            <button
              className="create-project-button"
              onClick={() => setView('manage-projects')}
              style={{ backgroundColor: '#ff9800' }}
            >
              Manage Projects
            </button>
          )}
          {isAdminOnly && (
            <button
              className="holiday-management-button"
              onClick={() => setView('holiday-management')}
              style={{ backgroundColor: '#4caf50' }}
            >
              Manage Holidays
            </button>
          )}
          {isUserAnApprover(user, projects) && (
            <button 
              className="approvals-button"
              onClick={() => setView('approvals')}
            >
              View Timesheets for Approval
            </button>
          )}
        </div>

        <div className="week-selector">
          <button onClick={handlePreviousWeek}>Previous Week</button>
          <h3>Week of {new Date(selectedWeek.start).toLocaleDateString()} - {new Date(selectedWeek.end).toLocaleDateString()}</h3>
          <button onClick={handleNextWeek}>Next Week</button>
        </div>

        <div className="timesheet-table-container scrollable-timesheet-container">
          <table className="timesheet-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Billable</th>
                {weekDays.map((day, index) => (
                  <th key={index}>{day.name}<br/>{day.date}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {weeklyEntries.map((entry, index) => (
                <tr key={index} className={entry.id === activeTimesheetForComments ? 'active-for-comments' : ''}>
                  <td>
                    {entry.projectName}
                    {entry.comments && <span className="has-comments-indicator"> 💬</span>}
                  </td>
                  <td>{entry.isBillable ? 'Yes' : 'No'}</td>
                  <td><input type="number" min="0" max="24" value={entry.sunday || 0} readOnly /></td>
                  <td><input type="number" min="0" max="24" value={entry.monday || 0} readOnly /></td>
                  <td><input type="number" min="0" max="24" value={entry.tuesday || 0} readOnly /></td>
                  <td><input type="number" min="0" max="24" value={entry.wednesday || 0} readOnly /></td>
                  <td><input type="number" min="0" max="24" value={entry.thursday || 0} readOnly /></td>
                  <td><input type="number" min="0" max="24" value={entry.friday || 0} readOnly /></td>
                  <td><input type="number" min="0" max="24" value={entry.saturday || 0} readOnly /></td>
                  
                  <td>
                    <div className="timesheet-actions">
                      <button onClick={() => handleDeleteEntry(entry.id)}>Delete</button>
                      {entry.comments && (
                        <button 
                          className="view-comments-btn"
                          onClick={() => {
                            setActiveTimesheetForComments(entry.id);
                            setWeekComments(entry.comments);
                          }}
                        >
                          Edit Comments
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {/* New entry form row */}
              <tr className="new-entry-row">
                <td>
                  <select 
                    value={selectedProjectId} 
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project._id} value={project._id}>
                        {project.projectName} {project.isSystemProject ? '' : `(${project.clientName})`}
                      </option>
                    ))}
                    
                  </select>
                </td>
                <td>
                  <select 
                    value={isBillable ? 'yes' : 'no'} 
                    onChange={(e) => setIsBillable(e.target.value === 'yes')}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </td>
                <td>
                  <input 
                    type="number" 
                    min="0" 
                    max="24" 
                    value={dayHours.sunday || ''} 
                    onChange={(e) => {
                      const hours = e.target.value;
                      if (hours === '' || validateDayHours('sunday', hours)) {
                        if (checkHolidayConflict('sunday', hours)) {
                          // No holiday conflict, set hours normally
                          setDayHours({...dayHours, sunday: hours});
                        }
                        // If there's a holiday conflict, the modal will handle it
                        // Don't set hours here - let the modal handle the decision
                      }
                    }}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    min="0" 
                    max="24" 
                    value={dayHours.monday || ''} 
                    onChange={(e) => {
                      const hours = e.target.value;
                      if (hours === '' || validateDayHours('monday', hours)) {
                        if (checkHolidayConflict('monday', hours)) {
                          setDayHours({...dayHours, monday: hours});
                        }
                      }
                    }}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    min="0" 
                    max="24" 
                    value={dayHours.tuesday || ''} 
                    onChange={(e) => {
                      const hours = e.target.value;
                      if (hours === '' || validateDayHours('tuesday', hours)) {
                        if (checkHolidayConflict('tuesday', hours)) {
                          setDayHours({...dayHours, tuesday: hours});
                        }
                      }
                    }}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    min="0" 
                    max="24" 
                    value={dayHours.wednesday || ''} 
                    onChange={(e) => {
                      const hours = e.target.value;
                      if (hours === '' || validateDayHours('wednesday', hours)) {
                        if (checkHolidayConflict('wednesday', hours)) {
                          setDayHours({...dayHours, wednesday: hours});
                        }
                      }
                    }}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    min="0" 
                    max="24" 
                    value={dayHours.thursday || ''} 
                    onChange={(e) => {
                      const hours = e.target.value;
                      if (hours === '' || validateDayHours('thursday', hours)) {
                        if (checkHolidayConflict('thursday', hours)) {
                          setDayHours({...dayHours, thursday: hours});
                        }
                      }
                    }}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    min="0" 
                    max="24" 
                    value={dayHours.friday || ''} 
                    onChange={(e) => {
                      const hours = e.target.value;
                      if (hours === '' || validateDayHours('friday', hours)) {
                        if (checkHolidayConflict('friday', hours)) {
                          setDayHours({...dayHours, friday: hours});
                        }
                      }
                    }}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    min="0" 
                    max="24" 
                    value={dayHours.saturday || ''} 
                    onChange={(e) => {
                      const hours = e.target.value;
                      if (hours === '' || validateDayHours('saturday', hours)) {
                        if (checkHolidayConflict('saturday', hours)) {
                          setDayHours({...dayHours, saturday: hours});
                        }
                      }
                    }}
                  />
                </td>



                
                <td>
                  <button 
                    onClick={handleAddTimeEntry}
                    disabled={!selectedProjectId}
                  >
                    Add
                  </button>
                </td>
              </tr>
              
              {/* Totals row */}
              <tr className="totals-row">
                <td colSpan="2">Daily Totals</td>
                <td>{totalHours.monday}</td>
                <td>{totalHours.tuesday}</td>
                <td>{totalHours.wednesday}</td>
                <td>{totalHours.thursday}</td>
                <td>{totalHours.friday}</td>
                <td>{totalHours.saturday}</td>
                <td>{totalHours.sunday}</td>
                <td>Total: {totalHours.total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="comments-section">
          {activeTimesheetForComments ? (
            <>
              <label className="comments-label">
                Add Comments for: <strong>{weeklyEntries.find(e => e.id === activeTimesheetForComments)?.projectName}</strong>
              </label>
              <textarea
                className="comments-input"
                placeholder="Add comments for this timesheet..."
                value={weekComments}
                onChange={(e) => setWeekComments(e.target.value)}
                rows={3}
              />
              <div className="comments-actions">
                <button 
                  className="save-comments-btn"
                  onClick={handleSaveComments}
                  disabled={!weekComments.trim()}
                >
                  Save Comments
                </button>
                <button 
                  className="skip-comments-btn"
                  onClick={() => {
                    setActiveTimesheetForComments(null);
                    setWeekComments('');
                  }}
                >
                  Skip Comments
                </button>
              </div>
            </>
          ) : (
            <div className="no-active-timesheet">
              <p>Add a timesheet above to write comments for it.</p>
            </div>
          )}
        </div>

        
        <div className="timesheet-actions">
          <button 
            className="timesheet-history-btn"
            onClick={() => setView('history')}
          >
            Timesheet History
          </button>

          {isAdminOnly && (
            <button 
              className="admin-calendar-button"
              onClick={() => setView('admin-calendar')}
            >
              Admin Calendar
            </button>
          )}
          
          
          <button
            className="submit-timesheet-button"
            onClick={handleSubmitClick} // Changed from handleSubmitTimesheet
            disabled={isSubmittingTimesheet || weeklyEntries.length === 0}
          >
            {isSubmittingTimesheet ? 'Submitting...' : 'Submit Timesheet'}
          </button>
        </div>
      </div>
      // Replace your existing holiday-management view with this enhanced version:
      ) : view === 'holiday-management' ? (
        <div className="holiday-management-view">
          <div className="approval-header">
            <h2>Holiday Management</h2>
            <button 
              className="back-button"
              onClick={() => setView('list')}
            >
              Back to Timesheet
            </button>
          </div>
          
          <div className="holiday-management-content">
            {/* Left side - Holiday List */}
            <div className="holiday-list-section">
              <h3>Current Holidays ({holidays.length})</h3>
              {holidays.length === 0 ? (
                <p>No holidays configured</p>
              ) : (
                <div className="holidays-grid">
                  {holidays.map(holiday => (
                    <div key={holiday.date} className="holiday-item">
                      <div className="holiday-info">
                        <strong>{holiday.name}</strong>
                        <span>{new Date(holiday.date + 'T00:00:00').toLocaleDateString()}</span>
                      </div>
                      <button
                        className="delete-holiday-btn"
                        onClick={() => {
                          setHolidayToDelete(holiday);
                          setShowDeleteHolidayConfirmation(true);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Right side - Calendar */}
            <div className="holiday-calendar-section">
              <h3>Add/Remove Holidays</h3>
              <p className="calendar-instructions">
                Click on any date to add a holiday. Click on existing holidays to remove them.
              </p>
              
              <div className="holiday-calendar">
                <div className="calendar-header">
                  <button 
                    className="calendar-nav-btn"
                    onClick={() => {
                      const newDate = new Date(holidayCalendarDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setHolidayCalendarDate(newDate);
                    }}
                  >
                    ‹
                  </button>
                  <h4>{formatHolidayCalendarMonthYear(holidayCalendarDate)}</h4>
                  <button 
                    className="calendar-nav-btn"
                    onClick={() => {
                      const newDate = new Date(holidayCalendarDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setHolidayCalendarDate(newDate);
                    }}
                  >
                    ›
                  </button>
                </div>
                
                <div className="calendar-grid">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="calendar-day-header">{day}</div>
                  ))}
                  
                  {/* Calendar days */}
                  {getHolidayCalendarDays(holidayCalendarDate).map((date, index) => {
                    const isHoliday = isDateHoliday(date);
                    const isToday = date && date.toDateString() === new Date().toDateString();
                    
                    return (
                      <div
                        key={index}
                        className={`calendar-day ${date ? 'active' : 'inactive'} ${isHoliday ? 'holiday' : ''} ${isToday ? 'today' : ''}`}
                        onClick={() => handleCalendarDateClick(date)}
                        title={isHoliday ? `Holiday: ${isHoliday.name}` : date ? 'Click to add holiday' : ''}
                      >
                        {date && (
                          <>
                            <div className="day-number">{date.getDate()}</div>
                            {isHoliday && <div className="holiday-indicator">🎉</div>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
    ) : view === 'new-project' ? (
      <div className="project-form-container">
        <h2>Create New Project</h2>
        <div className="project-form">
          <div className="form-group">
            <label>Project Name</label>
            <input
              type="text"
              value={newProject.projectName}
              onChange={(e) => setNewProject({...newProject, projectName: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Client Name</label>
            <input
              type="text"
              value={newProject.clientName}
              onChange={(e) => setNewProject({...newProject, clientName: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Project Type</label>
            <input
              type="text"
              value={newProject.projectType}
              onChange={(e) => setNewProject({...newProject, projectType: e.target.value})}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>PO Number</label>
              <input
                type="text"
                value={newProject.poNumber}
                onChange={(e) => setNewProject({...newProject, poNumber: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Contract Number</label>
              <input
                type="text"
                value={newProject.contractNumber}
                onChange={(e) => setNewProject({...newProject, contractNumber: e.target.value})}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={newProject.dateRange.start}
                onChange={(e) => setNewProject({
                  ...newProject, 
                  dateRange: {...newProject.dateRange, start: e.target.value}
                })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={newProject.dateRange.end}
                onChange={(e) => setNewProject({
                  ...newProject, 
                  dateRange: {...newProject.dateRange, end: e.target.value}
                })}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Max Hours</label>
              <input
                type="number"
                value={newProject.maxHours}
                onChange={(e) => setNewProject({...newProject, maxHours: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Max Budget</label>
              <input
                type="number"
                value={newProject.maxBudget}
                onChange={(e) => setNewProject({...newProject, maxBudget: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Approvers (comma-separated emails)</label>
            <input
              type="text"
              value={newProject.approvers}
              onChange={(e) => setNewProject({...newProject, approvers: e.target.value})}
              placeholder="e.g. approver1@example.com, approver2@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Project Members (comma-separated emails)</label>
            <input
              type="text"
              value={newProject.projectMembers}
              onChange={(e) => setNewProject({...newProject, projectMembers: e.target.value})}
              placeholder="e.g. member1@example.com, member2@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              value={newProject.location}
              onChange={(e) => setNewProject({...newProject, location: e.target.value})}
            />
          </div>
          
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={newProject.isHybrid}
                onChange={(e) => setNewProject({...newProject, isHybrid: e.target.checked})}
              />
              Hybrid Project
            </label>
          </div>
          
          <div className="form-buttons">
            <button onClick={() => setView('list')}>Cancel</button>
            <button
              onClick={handleCreateProjectClick} // Changed from handleCreateProject
              disabled={isCreatingProject || !newProject.projectName || !newProject.clientName ||
                      !newProject.dateRange.start || !newProject.dateRange.end ||
                      !newProject.maxHours || !newProject.maxBudget ||
                      !newProject.approvers || !newProject.projectMembers}
            >
              {isCreatingProject ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
      ) : view === 'edit-project' ? (
        <div className="project-form-container">
          <h2>Edit Project: {editingProject?.projectName}</h2>
          <div className="project-form">
            <div className="form-group">
              <label>Project Name *</label>
              <input
                type="text"
                value={editProjectForm.projectName}
                onChange={(e) => setEditProjectForm({...editProjectForm, projectName: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Client Name *</label>
              <input
                type="text"
                value={editProjectForm.clientName}
                onChange={(e) => setEditProjectForm({...editProjectForm, clientName: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Project Type *</label>
              <input
                type="text"
                value={editProjectForm.projectType}
                onChange={(e) => setEditProjectForm({...editProjectForm, projectType: e.target.value})}
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>PO Number</label>
                <input
                  type="text"
                  value={editProjectForm.poNumber}
                  onChange={(e) => setEditProjectForm({...editProjectForm, poNumber: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Contract Number</label>
                <input
                  type="text"
                  value={editProjectForm.contractNumber}
                  onChange={(e) => setEditProjectForm({...editProjectForm, contractNumber: e.target.value})}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={editProjectForm.dateRange.start}
                  onChange={(e) => setEditProjectForm({
                    ...editProjectForm, 
                    dateRange: {...editProjectForm.dateRange, start: e.target.value}
                  })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  value={editProjectForm.dateRange.end}
                  onChange={(e) => setEditProjectForm({
                    ...editProjectForm, 
                    dateRange: {...editProjectForm.dateRange, end: e.target.value}
                  })}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Max Hours *</label>
                <input
                  type="number"
                  value={editProjectForm.maxHours}
                  onChange={(e) => setEditProjectForm({...editProjectForm, maxHours: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Max Budget *</label>
                <input
                  type="number"
                  value={editProjectForm.maxBudget}
                  onChange={(e) => setEditProjectForm({...editProjectForm, maxBudget: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Approvers (comma-separated emails) *</label>
              <input
                type="text"
                value={editProjectForm.approvers}
                onChange={(e) => setEditProjectForm({...editProjectForm, approvers: e.target.value})}
                placeholder="e.g. approver1@example.com, approver2@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Project Members (comma-separated emails) *</label>
              <input
                type="text"
                value={editProjectForm.projectMembers}
                onChange={(e) => setEditProjectForm({...editProjectForm, projectMembers: e.target.value})}
                placeholder="e.g. member1@example.com, member2@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={editProjectForm.location}
                onChange={(e) => setEditProjectForm({...editProjectForm, location: e.target.value})}
              />
            </div>
            
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={editProjectForm.isHybrid}
                  onChange={(e) => setEditProjectForm({...editProjectForm, isHybrid: e.target.checked})}
                />
                Hybrid Project
              </label>
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={editProjectForm.isActive}
                  onChange={(e) => setEditProjectForm({...editProjectForm, isActive: e.target.checked})}
                />
                Project Active
              </label>
            </div>
            
            <div className="form-buttons">
              <button onClick={() => {
                setView('manage-projects');
                setEditingProject(null);
              }}>Cancel</button>
              <button
                onClick={handleEditProjectClick}
                disabled={isUpdatingProject || !editProjectForm.projectName || !editProjectForm.clientName ||
                        !editProjectForm.dateRange.start || !editProjectForm.dateRange.end ||
                        !editProjectForm.maxHours || !editProjectForm.maxBudget ||
                        !editProjectForm.approvers || !editProjectForm.projectMembers}
              >
                {isUpdatingProject ? 'Updating...' : 'Update Project'}
              </button>
            </div>
          </div>
        </div>


    ) : view === 'approvals' ? (
      selectedProjectId ? (
        // LEVEL 2: Timesheets Table for Selected Project (4 per page)
        <div className="approval-table-view">
          <div className="approval-header">
            <h2>Timesheets for {projects.find(p => p._id === selectedProjectId)?.projectName}</h2>
            <button 
              className="back-button"
              onClick={() => {
                setSelectedProjectId(null);
                setSelectedProjectTimesheets([]);
                setSelectedTimesheets([]);
                setCurrentTimesheetPage(1);
              }}
            >
              Back to Projects
            </button>
          </div>
          
          {selectedProjectTimesheets.length === 0 ? (
            <div className="no-reports">
              <p>No submitted timesheets found for this project.</p>
            </div>
          ) : (
            <>
              <div className="approval-table-container">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            const currentPageTimesheets = getPaginatedTimesheets(selectedProjectTimesheets);
                            if (e.target.checked) {
                              setSelectedTimesheets([...new Set([...selectedTimesheets, ...currentPageTimesheets.map(t => t._id)])]);
                            } else {
                              setSelectedTimesheets(selectedTimesheets.filter(id => !currentPageTimesheets.map(t => t._id).includes(id)));
                            }
                          }}
                          checked={getPaginatedTimesheets(selectedProjectTimesheets).length > 0 && 
                                  getPaginatedTimesheets(selectedProjectTimesheets).every(t => selectedTimesheets.includes(t._id))}
                        />
                      </th>
                      <th>Employee</th>
                      <th>Week</th>
                      <th>Total Hours</th>
                      <th>Current Status</th>
                      <th>Decision</th>
                      <th>Comments</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedTimesheets(selectedProjectTimesheets).map(timesheet => (
                      <React.Fragment key={timesheet._id}>
                        <tr className="approval-row">
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedTimesheets.includes(timesheet._id)}
                              onChange={() => {
                                if (selectedTimesheets.includes(timesheet._id)) {
                                  setSelectedTimesheets(selectedTimesheets.filter(id => id !== timesheet._id));
                                } else {
                                  setSelectedTimesheets([...selectedTimesheets, timesheet._id]);
                                }
                              }}
                            />
                          </td>
                          <td>{timesheet.employeeName}</td>
                          <td className="date-range">
                            {new Date(timesheet.weekStartDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} - {new Date(timesheet.weekEndDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                          </td>
                          <td className="amount">{timesheet.totalHours.toFixed(1)} hrs</td>
                          <td>
                            <span className={`status-badge ${timesheet.status}`}>{timesheet.status}</span>
                          </td>
                          <td>
                            <select
                              value={timesheetStatusUpdates[timesheet._id]?.status || timesheet.status}
                              onChange={(e) => setTimesheetStatusUpdates({
                                ...timesheetStatusUpdates,
                                [timesheet._id]: {
                                  ...timesheetStatusUpdates[timesheet._id],
                                  status: e.target.value
                                }
                              })}
                              className="decision-select"
                            >
                              <option value="submitted">Submitted</option>
                              <option value="approved">Approved</option>
                              <option value="denied">Denied</option>
                            </select>
                          </td>
                          <td>
                            <textarea
                              placeholder="* Reason for decision... *"
                              value={timesheetStatusUpdates[timesheet._id]?.approvalComments || timesheet.approvalComments || ''}
                              onChange={(e) => setTimesheetStatusUpdates({
                                ...timesheetStatusUpdates,
                                [timesheet._id]: {
                                  ...timesheetStatusUpdates[timesheet._id],
                                  approvalComments: e.target.value
                                }
                              })}
                              className="reason-textarea"
                              rows="2"
                            />
                          </td>
                          <td className="actions-cell-horizontal">
                            <button
                              className="submit-decision-btn"
                              onClick={() => handleSubmitTimesheetDecision(timesheet._id)}
                              disabled={
                                !timesheetStatusUpdates[timesheet._id] ||
                                timesheetStatusUpdates[timesheet._id]?.status === timesheet.status ||
                                ((timesheetStatusUpdates[timesheet._id]?.status === 'approved' || 
                                  timesheetStatusUpdates[timesheet._id]?.status === 'denied') &&
                                !timesheetStatusUpdates[timesheet._id]?.approvalComments)
                              }
                            >
                              Submit
                            </button>
                            <button
                              className="details-toggle-button"
                              onClick={() => setExpandedTimesheet(expandedTimesheet === timesheet._id ? null : timesheet._id)}
                            >
                              {expandedTimesheet === timesheet._id ? 'Hide' : 'Details'}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Details Row */}
                        {expandedTimesheet === timesheet._id && (
                          <tr className="expanded-row">
                            <td colSpan="8">
                              <div className="trip-details-expanded">

                                <div className="submission-info-section">
                                  <h4>Submission Details:</h4>
                                  <div className="detail-row">
                                    <span className="detail-label">Submitted on:</span>
                                    <span className="detail-value">
                                      {new Date(timesheet.submittedDate).toLocaleDateString('en-US', { 
                                        timeZone: 'UTC',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                </div>
                                
                                
                                {/* Approval information */}
                                {timesheet.approverEmail && (
                                  <div className={`approval-info-section ${timesheet.status === 'approved' ? 'approved-status' : timesheet.status === 'denied' ? 'denied-status' : ''}`}>
                                    <h4>Approval Details:</h4>
                                    <div className="detail-row">
                                      <span className="detail-label">{timesheet.status === 'approved' ? 'Approved by:' : 'Denied by:'}</span>
                                      <span className="detail-value">{timesheet.approverEmail}</span>
                                    </div>
                                    {timesheet.approvedDate && (
                                      <div className="detail-row">
                                        <span className="detail-label">{timesheet.status === 'approved' ? 'Approved on:' : 'Denied on:'}</span>
                                        <span className="detail-value">{new Date(timesheet.approvedDate).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Employee's week comments */}
                                {timesheet.comments && (
                                  <div className="detail-row">
                                    <span className="detail-label">Employee Week Comments:</span>
                                    <span className="detail-value">{timesheet.comments}</span>
                                  </div>
                                )}
                                
                                {/* Approver's comments */}
                                {timesheet.approvalComments && (
                                  <div className="detail-row">
                                    <span className="detail-label">Approval Comments:</span>
                                    <span className="detail-value">{timesheet.approvalComments}</span>
                                  </div>
                                )}
                                
                                {/* Daily breakdown */}
                                <h4>Daily Breakdown</h4>
                                <div className="expenses-list">
                                  {timesheet.dayEntries.map((day, index) => (
                                    <div key={index} className="expense-item">
                                      <div className="expense-details">
                                        <p>Date: {new Date(day.date).toLocaleDateString()}</p>
                                        <p>Hours: {day.hours}</p>
                                        {day.notes && <p>Notes: {day.notes}</p>}
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
              </div>

              {/* Pagination Controls for Timesheets */}
              <div className="pagination-container">
                <div className="pagination-info">
                  Showing {Math.min((currentTimesheetPage - 1) * timesheetsPerPage + 1, selectedProjectTimesheets.length)} to {Math.min(currentTimesheetPage * timesheetsPerPage, selectedProjectTimesheets.length)} of {selectedProjectTimesheets.length} timesheets
                </div>
                
                <div className="pagination-controls">
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentTimesheetPage(1)}
                    disabled={currentTimesheetPage === 1}
                  >
                    First
                  </button>
                  
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentTimesheetPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentTimesheetPage === 1}
                  >
                    Previous
                  </button>
                  
                  <span className="page-info">
                    Page {currentTimesheetPage} of {Math.ceil(selectedProjectTimesheets.length / timesheetsPerPage)}
                  </span>
                  
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentTimesheetPage(prev => Math.min(prev + 1, Math.ceil(selectedProjectTimesheets.length / timesheetsPerPage)))}
                    disabled={currentTimesheetPage === Math.ceil(selectedProjectTimesheets.length / timesheetsPerPage)}
                  >
                    Next
                  </button>
                  
                  <button 
                    className="pagination-btn"
                    onClick={() => setCurrentTimesheetPage(Math.ceil(selectedProjectTimesheets.length / timesheetsPerPage))}
                    disabled={currentTimesheetPage === Math.ceil(selectedProjectTimesheets.length / timesheetsPerPage)}
                  >
                    Last
                  </button>
                </div>
              </div>

              {/* Batch Actions */}
              <div className="batch-approval-actions">
                <button
                  className="submit-all-decisions"
                  disabled={selectedTimesheets.length === 0}
                  onClick={handleSubmitBatchDecisions}
                >
                  Submit Selected Decisions ({selectedTimesheets.length})
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        // LEVEL 1: Projects Table (2 per page)
        <div className="approval-table-view">
          <div className="approval-header">
            <h2>Projects for Approval</h2>
            <button 
              className="back-button"
              onClick={() => setView('list')}
            >
              Back to Timesheet
            </button>
          </div>
          
          {(() => {
            const editableProjects = getEditableProjects();
            const approverProjects = projects.filter(project => {
              if (isAdminOnly) return true;
              if (!project.approvers) return false;
              const approversList = project.approvers.split(',').map(email => email.trim());
              return approversList.includes(user.username);
            });
            
            return approverProjects.length === 0 ? (
              <div className="no-reports">
                <p>You are not assigned as an approver for any projects.</p>
              </div>
            ) : (
              <>
                <div className="approval-table-container">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Project Name</th>
                        <th>Client</th>
                        <th>Project Type</th>
                        <th>Date Range</th>
                        <th>Max Hours</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedProjects(approverProjects).map(project => (
                        <tr key={project._id} className="report-row">
                          <td className="report-name">{project.projectName}</td>
                          <td>{project.clientName}</td>
                          <td>{project.projectType}</td>
                          <td className="date-range">
                            {new Date(project.dateRange.start).toLocaleDateString('en-US', { timeZone: 'UTC' })} - 
                            {new Date(project.dateRange.end).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                          </td>
                          <td className="amount">{project.maxHours} hrs</td>
                          <td className="actions-cell-horizontal">
                            <button
                              className="edit-button"
                              onClick={() => handleViewProjectTimesheets(project._id)}
                            >
                              View Timesheets
                            </button>
                            {(isAdminOnly || isModerator) && (
                              <button
                                className="details-button"
                                onClick={() => setSelectedProjectDetails(project)}
                              >
                                Details
                              </button>
                            )}
                            
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls for Projects */}
                <div className="pagination-container">
                  <div className="pagination-info">
                    Showing {Math.min((currentProjectPage - 1) * projectsPerPage + 1, approverProjects.length)} to {Math.min(currentProjectPage * projectsPerPage, approverProjects.length)} of {approverProjects.length} projects
                  </div>
                  
                  <div className="pagination-controls">
                    <button 
                      className="pagination-btn"
                      onClick={() => setCurrentProjectPage(1)}
                      disabled={currentProjectPage === 1}
                    >
                      First
                    </button>
                    
                    <button 
                      className="pagination-btn"
                      onClick={() => setCurrentProjectPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentProjectPage === 1}
                    >
                      Previous
                    </button>
                    
                    <span className="page-info">
                      Page {currentProjectPage} of {Math.ceil(approverProjects.length / projectsPerPage)}
                    </span>
                    
                    <button 
                      className="pagination-btn"
                      onClick={() => setCurrentProjectPage(prev => Math.min(prev + 1, Math.ceil(approverProjects.length / projectsPerPage)))}
                      disabled={currentProjectPage === Math.ceil(approverProjects.length / projectsPerPage)}
                    >
                      Next
                    </button>
                    
                    <button 
                      className="pagination-btn"
                      onClick={() => setCurrentProjectPage(Math.ceil(approverProjects.length / projectsPerPage))}
                      disabled={currentProjectPage === Math.ceil(approverProjects.length / projectsPerPage)}
                    >
                      Last
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )
      // Add this new view after your existing views
      ) : view === 'manage-projects' ? (
        <div className="approval-table-view">
          <div className="approval-header">
            <h2>
              {isAdminOnly ? 'Manage All Projects' : 'Manage Your Projects'}
            </h2>
            <button 
              className="back-button"
              onClick={() => setView('list')}
            >
              Back to Timesheet
            </button>
          </div>
          
          {(() => {
            const editableProjects = getEditableProjects();
            
            return editableProjects.length === 0 ? (
              <div className="no-reports">
                <p>
                  {isAdminOnly 
                    ? 'No projects found in the system.' 
                    : 'You are not assigned as an approver or member of any projects.'
                  }
                </p>
              </div>
            ) : (
              <>
                <div className="projects-summary">
                  <p>
                    {isAdminOnly 
                      ? `Showing all ${editableProjects.length} projects in the system`
                      : `Showing ${editableProjects.length} projects you can manage`
                    }
                  </p>
                </div>
                
                <div className="approval-table-container">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Project Name</th>
                        <th>Client</th>
                        <th>Project Type</th>
                        <th>Date Range</th>
                        <th>Max Hours</th>
                        <th>Status</th>
                        <th>Your Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedProjects(editableProjects).map(project => {
                        const isApprover = project.approvers && project.approvers.split(',').map(email => email.trim()).includes(user.username);
                        const isMember = project.projectMembers && project.projectMembers.split(',').map(email => email.trim()).includes(user.username);
                        
                        return (
                          <tr key={project._id} className="report-row">
                            <td className="report-name">{project.projectName}</td>
                            <td>{project.clientName}</td>
                            <td>{project.projectType}</td>
                            <td className="date-range">
                              {new Date(project.dateRange.start).toLocaleDateString('en-US', { timeZone: 'UTC' })} - 
                              {new Date(project.dateRange.end).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                            </td>
                            <td className="amount">{project.maxHours} hrs</td>
                            <td>
                              <span className={`status-badge ${project.isActive ? 'active' : 'inactive'}`}>
                                {project.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="role-cell">
                              {isAdminOnly ? (
                                <span className="admin-badge">Admin</span>
                              ) : (
                                <div className="role-badges">
                                  {isApprover && <span className="role-badge approver">Approver</span>}
                                  {isMember && <span className="role-badge member">Member</span>}
                                </div>
                              )}
                            </td>
                            <td className="actions-cell-horizontal">
                              <button
                                className="edit-button"
                                onClick={() => handleEditProject(project)}
                                title="Edit this project"
                              >
                                Edit
                              </button>
                              <button
                                className="details-button"
                                onClick={() => setSelectedProjectDetails(project)}
                              >
                                Details
                              </button>
                              
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Add this after the table in manage-projects view */}
                <div className="pagination-container">
                  <div className="pagination-info">
                    Showing {Math.min((currentProjectPage - 1) * projectsPerPage + 1, editableProjects.length)} to {Math.min(currentProjectPage * projectsPerPage, editableProjects.length)} of {editableProjects.length} projects
                  </div>
                  
                  <div className="pagination-controls">
                    <button 
                      className="pagination-btn"
                      onClick={() => setCurrentProjectPage(1)}
                      disabled={currentProjectPage === 1}
                    >
                      First
                    </button>
                    
                    <button 
                      className="pagination-btn"
                      onClick={() => setCurrentProjectPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentProjectPage === 1}
                    >
                      Previous
                    </button>
                    
                    <span className="page-info">
                      Page {currentProjectPage} of {Math.ceil(editableProjects.length / projectsPerPage)}
                    </span>
                    
                    <button 
                      className="pagination-btn"
                      onClick={() => setCurrentProjectPage(prev => Math.min(prev + 1, Math.ceil(editableProjects.length / projectsPerPage)))}
                      disabled={currentProjectPage === Math.ceil(editableProjects.length / projectsPerPage)}
                    >
                      Next
                    </button>
                    
                    <button 
                      className="pagination-btn"
                      onClick={() => setCurrentProjectPage(Math.ceil(editableProjects.length / projectsPerPage))}
                      disabled={currentProjectPage === Math.ceil(editableProjects.length / projectsPerPage)}
                    >
                      Last
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
    ) : view === 'history' ? (
      <HistoryView
        userHistoryProjects={userHistoryProjects}
        userHistoryTimesheets={userHistoryTimesheets}
        selectedHistoryProjectId={selectedHistoryProjectId}
        expandedTimesheet={expandedTimesheet}
        currentHistoryProjectPage={currentHistoryProjectPage}
        currentHistoryTimesheetPage={currentHistoryTimesheetPage}
        fetchUserHistoryProjects={fetchUserHistoryProjects}
        fetchUserProjectTimesheets={fetchUserProjectTimesheets}
        setExpandedTimesheet={setExpandedTimesheet}
        setCurrentHistoryProjectPage={setCurrentHistoryProjectPage}
        setCurrentHistoryTimesheetPage={setCurrentHistoryTimesheetPage}
        handleBackToProjects={handleBackToProjects}
        handleBackToList={handleBackToList}
        projects={projects}
        setSelectedProjectDetails={setSelectedProjectDetails}
        setView={setView}
        setSelectedHistoryProjectId={setSelectedHistoryProjectId}
        setUserHistoryTimesheets={setUserHistoryTimesheets}
        isAdminOnly={isAdminOnly}  // Add this
        isModerator={isModerator}  // Add this
      />
    ) : view === 'admin-calendar' ? (
      <AdminCalendarDashboard />
    ) : null}
    {selectedProjectDetails && (
      <ProjectDetailsModal 
        project={selectedProjectDetails} 
        onClose={() => setSelectedProjectDetails(null)} 
      />
    )}
    {/* Decision Confirmation Dialog */}
    {showDecisionConfirmation && pendingDecision && (
      <div className="confirmation-overlay">
        <div className="confirmation-popup">
          <h3>Confirm Decision</h3>
          <p>
            Are you sure you want to <strong>{pendingDecision.update.status}</strong> this timesheet?
          </p>
          <div className="timesheet-info">
            <p><strong>Employee:</strong> {pendingDecision.timesheet.employeeName}</p>
            <p><strong>Week:</strong> {new Date(pendingDecision.timesheet.weekStartDate).toLocaleDateString()} - {new Date(pendingDecision.timesheet.weekEndDate).toLocaleDateString()}</p>
            <p><strong>Hours:</strong> {pendingDecision.timesheet.totalHours} hrs</p>
            {pendingDecision.update.approvalComments && (
              <p><strong>Comments:</strong> {pendingDecision.update.approvalComments}</p>
            )}
          </div>
          <div className="confirmation-buttons">
            <button 
              className="cancel-button" 
              onClick={() => {
                setShowDecisionConfirmation(false);
                setPendingDecision(null);
              }}
            >
              Cancel
            </button>
            <button 
              className="confirm-button" 
              onClick={handleConfirmedDecision}
            >
              Confirm {pendingDecision.update.status === 'approved' ? 'Approval' : 'Denial'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Batch Decision Confirmation Dialog */}
    {showBatchConfirmation && (
      <div className="confirmation-overlay">
        <div className="confirmation-popup">
          <h3>Confirm Batch Decisions</h3>
          <p>
            Are you sure you want to submit decisions for <strong>{selectedTimesheets.length}</strong> selected timesheets?
          </p>
          <div className="batch-summary">
            {selectedTimesheets.map(timesheetId => {
              const timesheet = selectedProjectTimesheets.find(t => t._id === timesheetId);
              const update = timesheetStatusUpdates[timesheetId];
              return (
                <div key={timesheetId} className="batch-item">
                  <span>{timesheet.employeeName}: </span>
                  <strong>{update?.status || 'No change'}</strong>
                </div>
              );
            })}
          </div>
          <div className="confirmation-buttons">
            <button 
              className="cancel-button" 
              onClick={() => setShowBatchConfirmation(false)}
            >
              Cancel
            </button>
            <button 
              className="confirm-button" 
              onClick={handleConfirmedBatchDecisions}
            >
              Confirm All Decisions
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Processing Decision Loading Overlay */}
    {isProcessingDecision && (
      <div className="processing-overlay">
        <div className="processing-popup">
          <div className="processing-spinner">⏳</div>
          <h3>Processing Decision...</h3>
          <p>
            {selectedTimesheets.length > 1 
              ? `Updating ${selectedTimesheets.length} timesheets` 
              : 'Updating timesheet status'
            }
          </p>
          <p>Please wait, do not close this window.</p>
        </div>
      </div>
    )}
    {showSubmitConfirmation && (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Confirm Timesheet Submission</h3>
          </div>
          
          <div className="modal-body">
            <p>Are you sure you want to submit your timesheet for the week of:</p>
            <p><strong>{new Date(selectedWeek.start).toLocaleDateString()} - {new Date(selectedWeek.end).toLocaleDateString()}</strong></p>
            
            <div className="submission-summary">
              <p>Total Hours: <strong>{totalHours.total}</strong></p>
              <p>Projects: <strong>{weeklyEntries.length}</strong></p>
            </div>
            
            <p className="warning-text">
              Are you sure you want to submit this timesheet?
            </p>
          </div>
          
          <div className="modal-actions">
            <button 
              className="cancel-button"
              onClick={() => setShowSubmitConfirmation(false)}
              disabled={isSubmittingTimesheet}
            >
              Cancel
            </button>
            <button
              className="confirm-submit-button"
              onClick={handleSubmitTimesheet}
              disabled={isSubmittingTimesheet}
            >
              Submit Timesheet
            </button>
          </div>
        </div>
      </div>
    )}
    {isSubmittingTimesheet && (
      <div className="processing-overlay">
        <div className="processing-popup">
          <div className="processing-spinner">⏳</div>
          <h3>Submitting Your Timesheet...</h3>
          <p>Processing {weeklyEntries.filter(entry => 
            entry.monday > 0 || entry.tuesday > 0 || entry.wednesday > 0 || 
            entry.thursday > 0 || entry.friday > 0 || entry.saturday > 0 || 
            entry.sunday > 0
          ).length} project(s)</p>
          <p>Total Hours: {totalHours.total}</p>
          <p>Please wait, do not close this window.</p>
        </div>
      </div>
    )}
    {showCreateProjectConfirmation && (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Confirm Project Creation</h3>
          </div>
          
          <div className="modal-body">
            <p>Are you sure you want to create this project?</p>
            
            <div className="submission-summary">
              <p><strong>Project:</strong> {newProject.projectName}</p>
              <p><strong>Client:</strong> {newProject.clientName}</p>
              <p><strong>Type:</strong> {newProject.projectType}</p>
              <p><strong>Duration:</strong> {new Date(newProject.dateRange.start).toLocaleDateString()} - {new Date(newProject.dateRange.end).toLocaleDateString()}</p>
              <p><strong>Max Hours:</strong> {newProject.maxHours}</p>
              <p><strong>Max Budget:</strong> ${newProject.maxBudget}</p>
            </div>
            
            <p className="warning-text">
              Once created, the project will be available to all assigned members.
            </p>
          </div>
          
          <div className="modal-actions">
            <button
              className="cancel-button"
              onClick={() => setShowCreateProjectConfirmation(false)}
              disabled={isCreatingProject}
            >
              Cancel
            </button>
            <button
              className="confirm-submit-button"
              onClick={handleCreateProject}
              disabled={isCreatingProject}
            >
              Create Project
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Processing overlay for project creation */}
    {isCreatingProject && (
      <div className="processing-overlay">
        <div className="processing-popup">
          <div className="processing-spinner">⏳</div>
          <h3>Creating Your Project...</h3>
          <p>Setting up "{newProject.projectName}"</p>
          <p>Client: {newProject.clientName}</p>
          <p>Please wait, do not close this window.</p>
        </div>
      </div>
    )}
    {/* Edit Project Confirmation Modal */}
    {showEditProjectConfirmation && (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Confirm Project Update</h3>
          </div>
          
          <div className="modal-body">
            <p>Are you sure you want to update this project?</p>
            
            <div className="submission-summary">
              <p><strong>Project:</strong> {editProjectForm.projectName}</p>
              <p><strong>Client:</strong> {editProjectForm.clientName}</p>
              <p><strong>Type:</strong> {editProjectForm.projectType}</p>
              <p><strong>Status:</strong> {editProjectForm.isActive ? 'Active' : 'Inactive'}</p>
              <p><strong>Max Hours:</strong> {editProjectForm.maxHours}</p>
              <p><strong>Max Budget:</strong> ${editProjectForm.maxBudget}</p>
            </div>
            
            <p className="warning-text">
              This will update the project for all members and timesheets.
            </p>
          </div>
          
          <div className="modal-actions">
            <button
              className="cancel-button"
              onClick={() => setShowEditProjectConfirmation(false)}
              disabled={isUpdatingProject}
            >
              Cancel
            </button>
            <button
              className="confirm-submit-button"
              onClick={handleUpdateProject}
              disabled={isUpdatingProject}
            >
              Update Project
            </button>
          </div>
        </div>
      </div>
    )}

    {showHourLimitModal && (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>⚠️ Daily Hour Limit Exceeded</h3>
          </div>
          
          <div className="modal-body">
            <p className="warning-text">
              You cannot enter more than <strong>8 hours</strong> in a single day.
            </p>
            
            <div className="hour-limit-details">
              <p><strong>Day:</strong> {hourLimitDetails.day}</p>
              <p><strong>Hours you tried to enter:</strong> {hourLimitDetails.hours}</p>
              <p><strong>Total hours for this day:</strong> {hourLimitDetails.dayTotal}</p>
            </div>
            
            <div className="hour-limit-explanation">
              <p>This includes hours from other projects you've already entered for {hourLimitDetails.day}.</p>
              <p>Please adjust your hours to stay within the 8-hour daily limit.</p>
            </div>
          </div>
          
          <div className="modal-actions">
            <button
              className="confirm-button"
              onClick={() => setShowHourLimitModal(false)}
            >
              Understood
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Processing overlay for project update */}
    {isUpdatingProject && (
      <div className="processing-overlay">
        <div className="processing-popup">
          <div className="processing-spinner">⏳</div>
          <h3>Updating Project...</h3>
          <p>Updating "{editProjectForm.projectName}"</p>
          <p>Please wait, do not close this window.</p>
        </div>
      </div>
    )}
    {showHolidayWarning && (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>🎉 Holiday Detected</h3>
          </div>
          
          <div className="modal-body">
            <p className="warning-text">
              <strong>{holidayWarningDetails.date}</strong> is a company holiday: <strong>{holidayWarningDetails.holidayName}</strong>
            </p>
            
            <div className="holiday-warning-details">
              <p><strong>Day:</strong> {holidayWarningDetails.day}</p>
              <p><strong>Hours you tried to enter:</strong> {holidayWarningDetails.hours}</p>
            </div>
            
            <div className="holiday-warning-explanation">
              <p>You typically shouldn't log work hours on company holidays.</p>
              <p>Consider using the "Holiday" project instead if you need to track this day.</p>
              <p><strong>Do you still want to proceed with logging these hours?</strong></p>
            </div>
          </div>
          
          <div className="modal-actions">
            <button
              className="cancel-button"
              onClick={() => {
                setShowHolidayWarning(false);
                setPendingHolidayHours(null);
                // Don't set the hours - just close the modal
              }}
            >
              Cancel
            </button>
            <button
              className="confirm-button"
              onClick={() => {
                // Allow the hours to be set
                const dayName = holidayWarningDetails.dayName;
                const hours = holidayWarningDetails.hours;
                
                setDayHours(prev => ({
                  ...prev,
                  [dayName]: hours
                }));
                
                setShowHolidayWarning(false);
                setPendingHolidayHours(null);
              }}
            >
              Proceed Anyway
            </button>
          </div>
        </div>
      </div>
    )}
    {/* Add Holiday Modal */}
    {showAddHolidayModal && selectedDateForHoliday && (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Add Holiday</h3>
          </div>
          
          <div className="modal-body">
            <p>Add a holiday for <strong>{selectedDateForHoliday.toLocaleDateString()}</strong></p>
            
            <div className="form-group">
              <label>Holiday Name:</label>
              <input
                type="text"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                placeholder="e.g., Christmas Day, New Year's Day"
                autoFocus
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button
              className="cancel-button"
              onClick={() => {
                setShowAddHolidayModal(false);
                setSelectedDateForHoliday(null);
                setNewHolidayName('');
              }}
            >
              Cancel
            </button>
            <button
              className="confirm-button"
              onClick={handleAddHoliday}
              disabled={!newHolidayName.trim()}
            >
              Add Holiday
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Delete Holiday Confirmation Modal */}
    {showDeleteHolidayConfirmation && holidayToDelete && (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Confirm Holiday Removal</h3>
          </div>
          
          <div className="modal-body">
            <p>Are you sure you want to remove this holiday?</p>
            <div className="holiday-details">
              <p><strong>Holiday:</strong> {holidayToDelete.name}</p>
              <p><strong>Date:</strong> {new Date(holidayToDelete.date + 'T00:00:00').toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="modal-actions">
            <button
              className="cancel-button"
              onClick={() => {
                setShowDeleteHolidayConfirmation(false);
                setHolidayToDelete(null);
              }}
            >
              Cancel
            </button>
            <button
              className="confirm-button"
              onClick={() => {
                toggleHoliday(new Date(holidayToDelete.date + 'T00:00:00'));
                setShowDeleteHolidayConfirmation(false);
                setHolidayToDelete(null);
              }}
            >
              Remove Holiday
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);




}

export default TimeTableManager;

