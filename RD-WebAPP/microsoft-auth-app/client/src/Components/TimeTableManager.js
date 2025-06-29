import React, { useState, useMemo, useEffect, useCallback } from 'react';
import './TimeTableManager.css';

function TimeTableManager({ onBack, user }) {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
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


  // Get default week (current week starting Monday)
  function getDefaultWeek() {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  }

  // Get day names for the selected week
  function getWeekDayNames() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const startDate = new Date(selectedWeek.start);
    
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
const fetchProjects = async () => {
  try {
    // Fetch projects where the current user is a member or all projects if admin
    const url = isAdmin 
      ? `${API_URL}/api/projects` 
      : `${API_URL}/api/projects?projectMember=${user.id}`;
      
    const response = await fetch(url);
    const data = await response.json();
    
    // Also include system projects (PTO, Holiday) for all users
    const systemProjects = data.filter(p => p.isSystemProject);
    const userProjects = isAdmin 
      ? data 
      : data.filter(p => p.projectMembers.includes(user.id) || p.isSystemProject);
    
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

      const data = await response.json();
      setProjects(prevProjects => [...prevProjects, data]);
      resetNewProjectForm();
      setView('list');
    } catch (error) {
      console.error('Error creating project:', error);
    }
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

  const handleAddTimeEntry = () => {
    if (!selectedProjectId) return;
    
    // Create a new row in the weekly entries
    const newEntry = {
      id: `temp-${Date.now()}`,
      projectId: selectedProjectId,
      projectName: projects.find(p => p._id === selectedProjectId)?.projectName || 'Unknown Project',
      isBillable,
      monday: dayHours.monday || 0,
      tuesday: dayHours.tuesday || 0,
      wednesday: dayHours.wednesday || 0,
      thursday: dayHours.thursday || 0,
      friday: dayHours.friday || 0,
      saturday: dayHours.saturday || 0,
      sunday: dayHours.sunday || 0
    };
    
    setWeeklyEntries([...weeklyEntries, newEntry]);
    
    // Reset form
    setSelectedProjectId('');
    setIsBillable(true);
    setDayHours({
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0
    });
  };

  const handleSubmitTimesheet = async () => {
    try {
      setIsSubmitting(true);
      
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
          const weekStart = new Date(selectedWeek.start);
          
          // Create day entries for each day of the week with hours > 0
          const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          
          daysOfWeek.forEach((day, index) => {
            const hours = Number(entry[day] || 0);
            if (hours > 0) {
              const date = new Date(weekStart);
              date.setDate(weekStart.getDate() + index);
              
              dayEntries.push({
                date: date.toISOString(),
                hours: hours,
                notes: ''
              });
            }
          });
          
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
            comments: weekComments // Add this line
          };
        });
      
      console.log('Submitting timesheet entries:', timeEntriesToSubmit);
      
      if (timeEntriesToSubmit.length === 0) {
        alert('No hours to submit. Please add hours to at least one project.');
        setIsSubmitting(false);
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
      alert('Timesheet submitted successfully!');
      
      // Refresh time entries
      fetchTimeEntries();
      setWeekComments('');
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      alert(`Failed to submit timesheet: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
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



// Add these component functions
const ApprovalsView = () => {
  // Get projects where user is an approver
  const approverProjects = projects.filter(project => {
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
  try {
    const update = timesheetStatusUpdates[timesheetId];
    if (!update) return;
    
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
      
      // Refresh the timesheets list to show updated data
      await handleViewProjectTimesheets(selectedProjectId);
      
      // Clear the status updates for this timesheet
      setTimesheetStatusUpdates(prev => ({
        ...prev,
        [timesheetId]: { status: updatedTimesheet.status, approvalComments: '' }
      }));
      
      alert('Timesheet status updated successfully!');
    }
  } catch (error) {
    console.error('Error updating timesheet status:', error);
    alert('Failed to update timesheet status');
  }
};

// Fetch projects that user has submitted timesheets for
const fetchUserHistoryProjects = async () => {
  try {
    const response = await fetch(`${API_URL}/api/timeentries/user-projects/${user.username}`);
    const data = await response.json();
    setUserHistoryProjects(data);
  } catch (error) {
    console.error('Error fetching user history projects:', error);
  }
};

// Fetch user's timesheets for a specific project
const fetchUserProjectTimesheets = async (projectId) => {
  try {
    const response = await fetch(`${API_URL}/api/timeentries/user-project/${user.username}/${projectId}`);
    const data = await response.json();
    setUserHistoryTimesheets(data);
    setSelectedHistoryProjectId(projectId);
  } catch (error) {
    console.error('Error fetching user project timesheets:', error);
  }
};

const HistoryView = () => {
  useEffect(() => {
    fetchUserHistoryProjects();
  }, []);

  if (selectedHistoryProjectId) {
    const project = projects.find(p => p._id === selectedHistoryProjectId);
    
    return (
      <div className="history-timesheets-container">
        <h2>Your Timesheets for {project?.projectName}</h2>
        
        <button 
          className="back-button"
          onClick={() => {
            setSelectedHistoryProjectId(null);
            setUserHistoryTimesheets([]);
          }}
        >
          Back to Projects
        </button>
        
        {userHistoryTimesheets.length === 0 ? (
          <p>No timesheets found for this project.</p>
        ) : (
          <div className="timesheets-table-container">
            <table className="timesheets-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                  <th>Submitted Date</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {userHistoryTimesheets.map(timesheet => (
                  <React.Fragment key={timesheet._id}>
                    <tr>
                      <td>{new Date(timesheet.weekStartDate).toLocaleDateString()} - {new Date(timesheet.weekEndDate).toLocaleDateString()}</td>
                      <td>{timesheet.totalHours}</td>
                      <td><span className={`status-badge ${timesheet.status}`}>{timesheet.status}</span></td>
                      <td>{new Date(timesheet.submittedDate).toLocaleDateString()}</td>
                      <td>
                        <button 
                          onClick={() => handleExpandTimesheet(timesheet._id)}
                          type="button"
                        >
                          {expandedTimesheet === timesheet._id ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>
                    {expandedTimesheet === timesheet._id && (
                      <tr>
                        <td colSpan="5">
                          <div className="expanded-timesheet-details">
                            {timesheet.comments && (
                              <div className="week-comments-table">
                                <h4>Week Comments:</h4>
                                <p>{timesheet.comments}</p>
                              </div>
                            )}
                            
                            {timesheet.approvalComments && (
                              <div className="approval-comments-display">
                                <h4>Approval Comments:</h4>
                                <p>{timesheet.approvalComments}</p>
                                {timesheet.approverEmail && (
                                  <p className="approver-info">
                                    <strong>Approved by:</strong> {timesheet.approverEmail}
                                    {timesheet.approvedDate && (
                                      <span> on {new Date(timesheet.approvedDate).toLocaleDateString()}</span>
                                    )}
                                  </p>
                                )}
                              </div>
                            )}

                            
                            <div className="day-entries-table">
                              <h4>Daily Breakdown:</h4>
                              {timesheet.dayEntries.map((day, index) => (
                                <div key={index} className="day-entry-row">
                                  <span>{new Date(day.date).toLocaleDateString()}: {day.hours} hours</span>
                                  {day.notes && <span> - Notes: {day.notes}</span>}
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
        )}
      </div>
    );
  };

  return (
    <div className="history-projects-container">
      <h2>Your Timesheet History</h2>
      
      <button 
        className="back-button"
        onClick={() => setView('list')}
      >
        Back to Timesheet
      </button>
      
      {userHistoryProjects.length === 0 ? (
        <p>You haven't submitted any timesheets yet.</p>
      ) : (
        <div className="projects-table-container">
          <table className="projects-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Client</th>
                <th>Total Timesheets</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {userHistoryProjects.map(project => (
                <tr key={project._id}>
                  <td>{project.projectName}</td>
                  <td>{project.clientName}</td>
                  <td>{project.timesheetCount}</td>
                  <td>
                    <button
                      className="view-timesheets-button-table"
                      onClick={() => fetchUserProjectTimesheets(project._id)}
                    >
                      View Timesheets
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
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
const fetchCalendarData = async () => {
  try {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const response = await fetch(`${API_URL}/api/admin/calendar-data?startDate=${startDate}&endDate=${endDate}`);
    const data = await response.json();
    setCalendarData(data);
  } catch (error) {
    console.error('Error fetching calendar data:', error);
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
const fetchEmployeeData = async (employeeName, range = 'month') => {
  try {
    console.log(`Fetching employee data for ${employeeName} with range ${range}`);
    
    const response = await fetch(`${API_URL}/api/admin/employee-data?employee=${encodeURIComponent(employeeName)}&range=${range}`);
    
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
  }
};

// Update this function in your TimeTableManager component
const fetchProjectData = async (projectId, range = 'month') => {
  try {
    console.log(`Fetching project data for ${projectId} with range ${range}`);
    
    const response = await fetch(`${API_URL}/api/admin/project-data?projectId=${projectId}&range=${range}`);
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Project data received:', data);
    
    setProjectData(data);
  } catch (error) {
    console.error('Error fetching project data:', error);
    setProjectData([]);
  }
};


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


// Add the Calendar Dashboard component
// Add the Calendar Dashboard component
const AdminCalendarDashboard = () => {
  

  const days = getDaysInMonth(calendarDate);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
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
      fetchEmployeeData(employeeName, employeeTimeRange);
    } else {
      setEmployeeData([]);
    }
  };
  
  const handleProjectSelect = (projectId) => {
    setSelectedProject(projectId);
    if (projectId) {
      fetchProjectData(projectId, projectTimeRange);
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
                      {calendarData[date.toISOString().split('T')[0]]?.totalHours || 0}h
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
                      fetchEmployeeData(selectedEmployee, e.target.value);
                    }
                  }}
                >
                  <option value="week">This Week</option>
                  <option value="2weeks">Last 2 Weeks</option>
                  <option value="month">This Month</option>
                </select>
              </div>
              
              {selectedEmployee && (
                <div className="employee-data">
                  <h5>{selectedEmployee} - {employeeTimeRange}</h5>
                  {employeeData.length > 0 ? (
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
                      fetchProjectData(selectedProject, e.target.value);
                    }
                  }}
                >
                  <option value="week">This Week</option>
                  <option value="2weeks">Last 2 Weeks</option>
                  <option value="month">This Month</option>
                </select>
              </div>
              
              {selectedProject && (
                <div className="project-data">
                  <h5>{projects.find(p => p._id === selectedProject)?.projectName}</h5>
                  {projectData.length > 0 ? (
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

        <div className="timesheet-table-container">
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
                <tr key={index}>
                  <td>{entry.projectName}</td>
                  <td>{entry.isBillable ? 'Yes' : 'No'}</td>
                  <td><input type="number" min="0" max="24" value={entry.monday || 0} readOnly /></td>
                  <td><input type="number" min="0" max="24" value={entry.tuesday || 0} readOnly /></td>
                  <td><input type="number" min="0" max="24" value={entry.wednesday || 0} readOnly /></td>
                  <td><input type="number" min="0" max="24" value={entry.thursday || 0} readOnly /></td>
                  <td><input type="number" min="0" max="24" value={entry.friday || 0} readOnly /></td>
                  <td><input type="number" min="0" max="24" value={entry.saturday || 0} readOnly /></td>
                  <td><input type="number" min="0" max="24" value={entry.sunday || 0} readOnly /></td>
                  <td>
                    <button onClick={() => handleDeleteEntry(entry.id)}>Delete</button>
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
                        {project.projectName}
                      </option>
                    ))}
                    <option value="holiday">Holiday</option>
                    <option value="pto">PTO</option>
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
                    value={dayHours.monday || ''} 
                    onChange={(e) => setDayHours({...dayHours, monday: e.target.value})}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    min="0" 
                    max="24" 
                    value={dayHours.tuesday || ''} 
                    onChange={(e) => setDayHours({...dayHours, tuesday: e.target.value})}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    min="0" 
                    max="24" 
                    value={dayHours.wednesday || ''} 
                    onChange={(e) => setDayHours({...dayHours, wednesday: e.target.value})}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    min="0" 
                    max="24" 
                    value={dayHours.thursday || ''} 
                    onChange={(e) => setDayHours({...dayHours, thursday: e.target.value})}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    min="0" 
                    max="24" 
                    value={dayHours.friday || ''} 
                    onChange={(e) => setDayHours({...dayHours, friday: e.target.value})}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    min="0" 
                    max="24" 
                    value={dayHours.saturday || ''} 
                    onChange={(e) => setDayHours({...dayHours, saturday: e.target.value})}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    min="0" 
                    max="24" 
                    value={dayHours.sunday || ''} 
                    onChange={(e) => setDayHours({...dayHours, sunday: e.target.value})}
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
          <label className="comments-label">Week Comments (Optional)</label>
          <textarea
            className="comments-input"
            placeholder="Add any comments for this week..."
            value={weekComments}
            onChange={(e) => setWeekComments(e.target.value)}
            rows={3}
          />
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
            onClick={handleSubmitTimesheet}
            disabled={isSubmitting || weeklyEntries.length === 0}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Timesheet'}
          </button>
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
              onClick={handleCreateProject}
              disabled={!newProject.projectName || !newProject.clientName ||
                      !newProject.dateRange.start || !newProject.dateRange.end ||
                      !newProject.maxHours || !newProject.maxBudget ||
                      !newProject.approvers || !newProject.projectMembers}
            >
              Create Project
            </button>
          </div>
        </div>
      </div>
    ) : view === 'approvals' ? (
      selectedProjectId ? (
        <div className="project-timesheets-container">
          <h2>Timesheets for {projects.find(p => p._id === selectedProjectId)?.projectName}</h2>
          
          <button 
            className="back-button"
            onClick={handleBackToProjectsFromApprovals}  // NEW
            type="button"  // NEW
          >
            Back to Projects
          </button>
          
          {selectedProjectTimesheets.length === 0 ? (
            <p>No submitted timesheets found for this project.</p>
          ) : (
            <div>
              {/* Group timesheets by employee */}
              {Object.entries(
                selectedProjectTimesheets.reduce((acc, timesheet) => {
                  if (!acc[timesheet.employeeName]) {
                    acc[timesheet.employeeName] = [];
                  }
                  acc[timesheet.employeeName].push(timesheet);
                  return acc;
                }, {})
              ).map(([employeeName, timesheets]) => (
                <div key={employeeName} className="employee-timesheets">
                  <h3>{employeeName}</h3>
                  
                  <div className="timesheets-table-container">
                    <table className="timesheets-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Week</th>
                          <th>Total Hours</th>
                          <th>Status</th>
                          <th>Decision</th>
                          <th>Comments</th>
                          <th>Action</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timesheets.map(timesheet => (
                          <>
                            <tr key={timesheet._id}>
                              <td>{timesheet.employeeName}</td>
                              <td>{new Date(timesheet.weekStartDate).toLocaleDateString()} - {new Date(timesheet.weekEndDate).toLocaleDateString()}</td>
                              <td>{timesheet.totalHours}</td>
                              <td><span className={`status-badge ${timesheet.status}`}>{timesheet.status}</span></td>
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
                                  className={`status-select ${timesheetStatusUpdates[timesheet._id]?.status || timesheet.status}`}
                                >
                                  <option value="submitted">Submitted</option>
                                  <option value="approved">Approved</option>
                                  <option value="denied">Denied</option>
                                </select>
                              </td>
                              <td>
                                <textarea
                                  placeholder="Approval comments *"
                                  value={timesheetStatusUpdates[timesheet._id]?.approvalComments || timesheet.approvalComments || ''}
                                  onChange={(e) => setTimesheetStatusUpdates({
                                    ...timesheetStatusUpdates,
                                    [timesheet._id]: {
                                      ...timesheetStatusUpdates[timesheet._id],
                                      approvalComments: e.target.value
                                    }
                                  })}
                                  className="approval-comments-table"
                                  rows={2}
                                />                              
                              </td>
                              <td>
                                <button
                                  className="submit-decision-button-table"
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
                              </td>
                              <td>
                                <button onClick={() => setExpandedTimesheet(expandedTimesheet === timesheet._id ? null : timesheet._id)}>
                                  {expandedTimesheet === timesheet._id ? '▲' : '▼'}
                                </button>
                              </td>
                            </tr>
                            {expandedTimesheet === timesheet._id && (
                              <tr>
                                <td colSpan="8">
                                  <div className="expanded-timesheet-details">
                                    
                                    {/* Employee's week comments */}
                                    {timesheet.comments && (
                                      <div className="week-comments-table">
                                        <h4>Employee Week Comments:</h4>
                                        <p>{timesheet.comments}</p>
                                      </div>
                                    )}
                                    
                                    {/* Approver's comments */}
                                    {timesheet.approvalComments && (
                                      <div className="approval-comments-display">
                                        <h4>Approval Comments:</h4>
                                        <p>{timesheet.approvalComments}</p>
                                      </div>
                                    )}
                                    
                                    {/* Your existing day entries code */}
                                    <div className="day-entries-table">
                                      <h4>Daily Breakdown:</h4>
                                      {timesheet.dayEntries.map((day, index) => (
                                        <div key={index} className="day-entry-row">
                                          <span>{new Date(day.date).toLocaleDateString()}: {day.hours} hours</span>
                                          {day.notes && <span> - Notes: {day.notes}</span>}
                                        </div>
                                      ))}
                                    </div>
                                    
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="approvals-container">
          <h2>Timesheets Pending Your Approval</h2>
          
          <button 
            className="back-button"
            onClick={handleBackToList}  // NEW
            type="button"  // NEW
          >
            Back to Timesheet
          </button>
          
          {/* Get projects where user is an approver */}
          {(() => {
            const approverProjects = projects.filter(project => {
              if (!project.approvers) return false;
              const approversList = project.approvers.split(',').map(email => email.trim());
              return approversList.includes(user.username);
            });

            
            return approverProjects.length === 0 ? (
              <p>You are not assigned as an approver for any projects.</p>
            ) : (
              <div className="projects-table-container">
                <table className="projects-table">
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Client</th>
                      <th>Date Range</th>
                      <th>Pending Timesheets</th> {/* Add this column */}
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approverProjects.map(project => (
                      <tr key={project._id}>
                        <td>{project.projectName}</td>
                        <td>{project.clientName}</td>
                        <td>
                          {new Date(project.dateRange.start).toLocaleDateString()} - 
                          {new Date(project.dateRange.end).toLocaleDateString()}
                        </td>
                        <td>
                          <span className="timesheet-count-badge">
                            {projectTimesheetCounts[project._id] || 0}
                          </span>
                        </td>
                        <td>
                          <button
                            className="view-timesheets-button-table"
                            onClick={() => handleViewProjectTimesheets(project._id)}
                          >
                            View Timesheets
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )
    ) : view === 'history' ? (
      <HistoryView />
    ) : view === 'admin-calendar' ? (
      <AdminCalendarDashboard />
    ) : null}
  </div>
);




}

export default TimeTableManager;

