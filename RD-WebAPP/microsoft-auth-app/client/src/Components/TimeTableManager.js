import React, { useState, useMemo, useEffect } from 'react';
import './TimeTableManager.css';

function TimeTableManager({ onBack, user }) {
  const API_URL = process.env.REACT_APP_API_URL;
  const [view, setView] = useState('list');
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProject, setNewProject] = useState({
    projectName: '',
    clientName: ''
  });
  const [timeEntry, setTimeEntry] = useState({
    employeeName: '',
    dateRange: {
      start: '',
      end: ''
    },
    employeeHours: ''
  });

  const ADMIN_EMAILS = useMemo(() => [
    'kkarumudi@recurringdecimal.com',
    'sn@recurringdecimal.com'
  ], []);

  const isAdmin = ADMIN_EMAILS.includes(user?.username);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_URL}/api/projects`);
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleCreateProject = async () => {
    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: newProject.projectName,
          clientName: newProject.clientName,
          projectTotalHours: 0
        })
      });

      const data = await response.json();
      setProjects([...projects, data]);
      setNewProject({ projectName: '', clientName: '' });
      setView('list');
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const [selectedProjectDetails, setSelectedProjectDetails] = useState(null);

  const handleShowDetails = async (projectId) => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}`);
      const data = await response.json();
      setSelectedProjectDetails(data);
      setView('show-details');
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };


  const handleAddTime = async (projectId) => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(timeEntry)
      });

      const updatedProject = await response.json();
      setProjects(projects.map(p => 
        p._id === projectId ? updatedProject : p
      ));
      setTimeEntry({
        employeeName: '',
        dateRange: { start: '', end: '' },
        employeeHours: ''
      });
      setView('list');
    } catch (error) {
      console.error('Error adding time:', error);
    }
  };

  return (
    <div className="timetable-container">
      {view === 'list' ? (
        <>
          <div className="header-buttons">
            <button
              className="home-button"
              onClick={onBack}
              style={{ backgroundColor: '#ff4444' }}
            >
              Home
            </button>
            {isAdmin && (
              <button
                className="create-project-button"
                onClick={() => setView('new-project')}
                style={{ backgroundColor: '#0078d4' }}
              >
                Create New Project
              </button>
            )}
          </div>

          <table className="projects-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Client Name</th>
                <th>Total Hours</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => (
                <tr key={project._id}>
                  <td>{project.projectName}</td>
                  <td>{project.clientName}</td>
                  <td>{project.projectTotalHours}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="add-time-button"
                        onClick={() => {
                          setSelectedProject(project._id);
                          setView('add-time');
                        }}
                      >
                        Add Time
                      </button>
                      <button
                        className="show-details-button"
                        onClick={() => handleShowDetails(project._id)}
                      >
                        Show Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : view === 'new-project' ? (
        <div className="project-form-container">
          <h2>Create New Project</h2>
          <div className="project-form">
            <input
              type="text"
              placeholder="Project Name"
              value={newProject.projectName}
              onChange={(e) => setNewProject({...newProject, projectName: e.target.value})}
            />
            <input
              type="text"
              placeholder="Client Name"
              value={newProject.clientName}
              onChange={(e) => setNewProject({...newProject, clientName: e.target.value})}
            />
            <div className="form-buttons">
              <button onClick={() => setView('list')}>Cancel</button>
              <button onClick={handleCreateProject}>Create Project</button>
            </div>
          </div>
        </div>
      ) : view === 'add-time' ? (
        <div className="time-form-container">
          <h2>Add Time Entry</h2>
          <div className="time-form">
            <input
              type="text"
              placeholder="Employee Name"
              value={timeEntry.employeeName}
              onChange={(e) => setTimeEntry({...timeEntry, employeeName: e.target.value})}
            />
            <div className="date-range">
              <input
                type="date"
                value={timeEntry.dateRange.start}
                onChange={(e) => setTimeEntry({
                  ...timeEntry, 
                  dateRange: {...timeEntry.dateRange, start: e.target.value}
                })}
              />
              <span>to</span>
              <input
                type="date"
                value={timeEntry.dateRange.end}
                onChange={(e) => setTimeEntry({
                  ...timeEntry, 
                  dateRange: {...timeEntry.dateRange, end: e.target.value}
                })}
              />
            </div>
            <input
              type="number"
              placeholder="Total Hours"
              value={timeEntry.employeeHours}
              onChange={(e) => setTimeEntry({...timeEntry, employeeHours: Number(e.target.value)})}
            />
            <div className="form-buttons">
              <button onClick={() => setView('list')}>Cancel</button>
              <button onClick={() => handleAddTime(selectedProject)}>Submit Time</button>
            </div>
          </div>
        </div>
      ): view === 'show-details' ? (
        <div className="details-container">
          <h2>{selectedProjectDetails?.projectName}</h2>
          <p>Client: {selectedProjectDetails?.clientName}</p>
          <p>Total Hours: {selectedProjectDetails?.projectTotalHours}</p>
          
          <h3>Employee Time Entries</h3>
          <table className="details-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {selectedProjectDetails?.employeeTimes.map((entry, index) => (
                <tr key={index}>
                  <td>{entry.employeeName}</td>
                  <td>{new Date(entry.dateRange.start).toLocaleDateString()}</td>
                  <td>{new Date(entry.dateRange.end).toLocaleDateString()}</td>
                  <td>{entry.employeeHours}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setView('list')}>Back to List</button>
        </div>
      )       
      : null}
    </div>
  );
} 

export default TimeTableManager;
