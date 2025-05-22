import React, { useState, useMemo, useEffect } from 'react';
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

  const ADMIN_EMAILS = useMemo(() => [
    'kkarumudi@recurringdecimal.com',
    'sn@recurringdecimal.com'
  ], []);

  const isAdmin = ADMIN_EMAILS.includes(user?.username);

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

  useEffect(() => {
    fetchProjects();
    if (selectedWeek.start && selectedWeek.end) {
      fetchTimeEntries();
    }
  }, [selectedWeek.start, selectedWeek.end]);

  // Calculate total hours whenever weekly entries change
  useEffect(() => {
    calculateTotalHours();
  }, [weeklyEntries]);

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
            employeeName: user.name,
            projectId: entry.projectId,
            weekStartDate: selectedWeek.start,
            weekEndDate: selectedWeek.end,
            isBillable: entry.isBillable,
            dayEntries,
            totalHours: dayEntries.reduce((sum, day) => sum + day.hours, 0),
            status: 'submitted',
            submittedDate: new Date().toISOString()
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
    const response = await fetch(
      `${API_URL}/api/timeentries/project/${projectId}?status=submitted`
    );
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    const data = await response.json();
    setSelectedProjectTimesheets(data);
    setSelectedProjectId(projectId);
  } catch (error) {
    console.error('Error fetching project timesheets:', error);
    setSelectedProjectTimesheets([]);
  }
};

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

        <div className="timesheet-actions">
          <button 
            className="submit-timesheet-button"
            onClick={handleSubmitTimesheet}
            disabled={weeklyEntries.length === 0}
          >
            Submit Timesheet
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
        <ProjectTimesheetsView />
      ) : (
        <ApprovalsView />
      )
    ) : null}
  </div>
);

}

export default TimeTableManager;

