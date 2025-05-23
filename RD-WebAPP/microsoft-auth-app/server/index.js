const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Trip, Expense } = require('./models/Expense');
const { Project, TimeEntry } = require('./models/TimeProject');
require('dotenv').config();

const { sendStatusEmail } = require('./services/notificationService');
const app = express();

app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected! 🚀'))
  .catch(err => console.error('MongoDB Error:', err));

// Get all trips
app.get('/api/trips', async (req, res) => {
  try {
    console.log('Incoming request query:', req.query);
    // Let's try fetching ALL trips first to see what's in the database
    const allTrips = await Trip.find({});
    console.log('All trips in database:', allTrips);
   
    // Then let's see what we get with the email filter
    const userTrips = await Trip.find({ email: req.query.email }).populate('expenses');
    console.log('User filtered trips:', userTrips);
   
    res.json(userTrips);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new trip
app.post('/api/trips', async (req, res) => {
  try {
    console.log('POST /api/trips - Request body:', req.body);
   
    const trip = new Trip({
      tripName: req.body.tripName,
      dateRange: req.body.dateRange,
      email: req.body.email,
      totalAmount: 0,
      status: 'pending'
    });
   
    console.log('Created trip object:', trip);
    const savedTrip = await trip.save();
    console.log('Saved trip:', savedTrip);
   
    res.status(200).json(savedTrip);
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add expense to trip
app.post('/api/trips/:tripId/expenses', async (req, res) => {
  try {
    console.log('Received expense data:', req.body);
    console.log('Trip ID:', req.params.tripId);

    const expense = new Expense({
      amount: req.body.amount,
      date: req.body.date,
      vendor: req.body.vendor,
      receipt: req.body.receipt,
      tripId: req.params.tripId
    });
    await expense.save();
    console.log('Saved expense:', expense);

    const trip = await Trip.findById(req.params.tripId);
    console.log('Found trip:', trip);

    trip.expenses.push(expense._id);
    trip.totalAmount += expense.amount;
    await trip.save();
    console.log('Updated trip:', trip);

    res.json(expense);
  } catch (error) {
    console.error('Error in expense creation:', error);
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

// Add this new endpoint for status updates only
app.put('/api/trips/:tripId/status', async (req, res) => {
  const notificationService = require('./services/notificationService');
  console.log('NOTIFICATION SERVICE LOADED:', notificationService);

  try {
    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.tripId,
      {
        status: req.body.status,
        reason: req.body.reason
      },
      { new: true }
    ).populate('expenses');

   const token = req.headers.authorization?.split(' ')[1];

   if(token) {
    await sendStatusEmail(token, updatedTrip);
   }

    res.json(updatedTrip);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message || 'Failed to update status' });
  }
});

// Update trip status
app.put('/api/trips/:tripId', async (req, res) => {
  try {
    // First update the trip details
    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.tripId,
      {
        tripName: req.body.tripName,
        dateRange: req.body.dateRange,
        totalAmount: req.body.totalAmount,
      },
      { new: true }
    );

    // Then handle expenses separately
    // First remove old expenses
    await Expense.deleteMany({ tripId: req.params.tripId });

    // Create new expenses
    const expensePromises = req.body.expenses.map(expense => {
      const newExpense = new Expense({
        amount: expense.amount,
        date: expense.date,
        vendor: expense.vendor,
        receipt: expense.receipt,
        tripId: req.params.tripId
      });
      return newExpense.save();
    });

    const savedExpenses = await Promise.all(expensePromises);
   
    // Update trip with new expense IDs
    updatedTrip.expenses = savedExpenses.map(exp => exp._id);
    await updatedTrip.save();

    res.json(updatedTrip);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message || 'Failed to update trip' });
  }
});

// Get all projects with optional filtering
app.get('/api/projects', async (req, res) => {
  try {
    console.log('Incoming project request query:', req.query);
    
    let query = {};
    
    // Filter by creator if specified
    if (req.query.createdBy) {
      query.createdBy = req.query.createdBy;
    }
    
    // Filter by project member if specified
    if (req.query.projectMember) {
      query.projectMembers = req.query.projectMember;
    }
    
    // Filter by active status
    if (req.query.isActive) {
      query.isActive = req.query.isActive === 'true';
    }
    
    const projects = await Project.find(query)
      .populate('approvers', 'name email')
      .populate('projectMembers', 'name email')
      .populate('createdBy', 'name email');
      
    console.log(`Found ${projects.length} projects`);
    res.json(projects);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new project with all fields
app.post('/api/projects', async (req, res) => {
  try {
    console.log('POST /api/projects - Request body:', req.body);
    
    const project = new Project({
      projectName: req.body.projectName,
      clientName: req.body.clientName,
      projectType: req.body.projectType,
      poNumber: req.body.poNumber,
      contractNumber: req.body.contractNumber,
      dateRange: req.body.dateRange,
      maxHours: req.body.maxHours,
      maxBudget: req.body.maxBudget,
      approvers: req.body.approvers || [],
      projectMembers: req.body.projectMembers || [],
      location: req.body.location,
      isHybrid: req.body.isHybrid || false,
      isActive: true,
      isSystemProject: req.body.isSystemProject || false,
      projectTotalHours: 0,
      projectTotalBilledHours: 0,
      createdBy: req.body.createdBy
    });
    
    console.log('Created project object:', project);
    const savedProject = await project.save();
    console.log('Saved project:', savedProject);
    
    res.status(201).json(savedProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single project by ID with time entries
app.get('/api/projects/:projectId', async (req, res) => {
  try {
    console.log('Fetching project by ID:', req.params.projectId);
    
    const project = await Project.findById(req.params.projectId)
      .populate('approvers', 'name email')
      .populate('projectMembers', 'name email')
      .populate('createdBy', 'name email');
    
    if (!project) {
      console.log('Project not found:', req.params.projectId);
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get time entries for this project
    const timeEntries = await TimeEntry.find({ projectId: req.params.projectId })
      .populate('employeeId', 'name email')
      .populate('approvedBy', 'name email');
    
    console.log('Found project with time entries');
    res.json({
      ...project.toObject(),
      timeEntries
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update project
app.put('/api/projects/:projectId', async (req, res) => {
  try {
    console.log('Updating project:', req.params.projectId, req.body);
    
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.projectId,
      {
        projectName: req.body.projectName,
        clientName: req.body.clientName,
        projectType: req.body.projectType,
        poNumber: req.body.poNumber,
        contractNumber: req.body.contractNumber,
        dateRange: req.body.dateRange,
        maxHours: req.body.maxHours,
        maxBudget: req.body.maxBudget,
        approvers: req.body.approvers,
        projectMembers: req.body.projectMembers,
        location: req.body.location,
        isHybrid: req.body.isHybrid,
        isActive: req.body.isActive,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!updatedProject) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(updatedProject);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message || 'Failed to update project' });
  }
});

// Get time entries for a specific week and employee
app.get('/api/timeentries', async (req, res) => {
  try {
    const { employeeId, weekStart, weekEnd } = req.query;
    console.log(`Fetching time entries for employee ${employeeId} from ${weekStart} to ${weekEnd}`);
    
    if (!employeeId || !weekStart || !weekEnd) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const timeEntries = await TimeEntry.find({
      employeeId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd
    }).populate('projectId');
    
    console.log(`Found ${timeEntries.length} time entries`);
    res.json(timeEntries);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new time entry
app.post('/api/timeentries', async (req, res) => {
  try {
    console.log('Creating time entry:', req.body);
    
    // Create day entries first
    const dayEntries = req.body.dayEntries.map(day => ({
      date: day.date,
      hours: day.hours,
      notes: day.notes || ''
    }));
    
    // Calculate total hours
    const totalHours = dayEntries.reduce((sum, day) => sum + day.hours, 0);
    
    const timeEntry = new TimeEntry({
      employeeId: req.body.employeeId,
      employeeName: req.body.employeeName,
      projectId: req.body.projectId,
      weekStartDate: req.body.weekStartDate,
      weekEndDate: req.body.weekEndDate,
      isBillable: req.body.isBillable,
      dayEntries,
      totalHours,
      status: req.body.status || 'draft',
      submittedDate: req.body.status === 'submitted' ? new Date() : null,
      comments: req.body.comments || ''
    });
    
    const savedTimeEntry = await timeEntry.save();
    
    // Update project total hours
    await Project.findByIdAndUpdate(
      req.body.projectId,
      {
        $inc: { 
          projectTotalHours: totalHours,
          projectTotalBilledHours: req.body.isBillable ? totalHours : 0
        }
      }
    );
    
    res.status(201).json(savedTimeEntry);
  } catch (error) {
    console.error('Error creating time entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch create multiple time entries (for weekly timesheet submission)
app.post('/api/timeentries/batch', async (req, res) => {
  try {
    console.log('Batch creating time entries:', req.body.length);
    
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Invalid request format' });
    }
    
    const savedEntries = [];
    const projectUpdates = {};
    
    // Process each time entry
    for (const entry of req.body) {
      // Create day entries
      const dayEntries = entry.dayEntries.map(day => ({
        date: day.date,
        hours: day.hours,
        notes: day.notes || ''
      }));
      
      // Calculate total hours
      const totalHours = dayEntries.reduce((sum, day) => sum + Number(day.hours), 0);
      
      const timeEntry = new TimeEntry({
        employeeId: entry.employeeId,
        employeeName: entry.employeeName,
        projectId: entry.projectId,
        weekStartDate: entry.weekStartDate,
        weekEndDate: entry.weekEndDate,
        isBillable: entry.isBillable,
        dayEntries,
        totalHours,
        status: entry.status || 'draft',
        submittedDate: entry.status === 'submitted' ? new Date() : null,
        comments: entry.comments || ''
      });
      
      const savedEntry = await timeEntry.save();
      savedEntries.push(savedEntry);
      
      // Track hours by project for batch update
      if (!projectUpdates[entry.projectId]) {
        projectUpdates[entry.projectId] = {
          totalHours: 0,
          billedHours: 0
        };
      }
      
      projectUpdates[entry.projectId].totalHours += totalHours;
      if (entry.isBillable) {
        projectUpdates[entry.projectId].billedHours += totalHours;
      }
    }
    
    // Update all affected projects in batch
    const projectUpdatePromises = Object.keys(projectUpdates).map(projectId => {
      return Project.findByIdAndUpdate(
        projectId,
        {
          $inc: {
            projectTotalHours: projectUpdates[projectId].totalHours,
            projectTotalBilledHours: projectUpdates[projectId].billedHours
          }
        }
      );
    });
    
    await Promise.all(projectUpdatePromises);
    
    res.status(201).json(savedEntries);
  } catch (error) {
    console.error('Error in batch time entry creation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update time entry status (for approval workflow)
app.put('/api/timeentries/:timeEntryId/status', async (req, res) => {
  try {
    const { status, approvedBy, comments } = req.body;
    console.log(`Updating time entry ${req.params.timeEntryId} status to ${status}`);
    
    if (!['draft', 'submitted', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updateData = {
      status,
      comments: comments || ''
    };
    
    // Add approval details if approved
    if (status === 'approved') {
      updateData.approvedBy = approvedBy;
      updateData.approvedDate = new Date();
    }
    
    const updatedEntry = await TimeEntry.findByIdAndUpdate(
      req.params.timeEntryId,
      updateData,
      { new: true }
    );
    
    if (!updatedEntry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    
    res.json(updatedEntry);
  } catch (error) {
    console.error('Error updating time entry status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create system projects (PTO, Holiday)
app.post('/api/system-projects', async (req, res) => {
  try {
    // Create PTO project
    const ptoProject = new Project({
      projectName: 'PTO',
      clientName: 'Internal',
      projectType: 'Time Off',
      dateRange: {
        start: new Date(new Date().getFullYear(), 0, 1), // Jan 1 current year
        end: new Date(new Date().getFullYear() + 10, 11, 31) // Dec 31 ten years from now
      },
      maxHours: 0, // Unlimited
      maxBudget: 0,
      isActive: true,
      isSystemProject: true,
      projectTotalHours: 0
    });
    
    // Create Holiday project
    const holidayProject = new Project({
      projectName: 'Holiday',
      clientName: 'Internal',
      projectType: 'Time Off',
      dateRange: {
        start: new Date(new Date().getFullYear(), 0, 1), // Jan 1 current year
        end: new Date(new Date().getFullYear() + 10, 11, 31) // Dec 31 ten years from now
      },
      maxHours: 0, // Unlimited
      maxBudget: 0,
      isActive: true,
      isSystemProject: true,
      projectTotalHours: 0
    });
    
    await ptoProject.save();
    await holidayProject.save();
    
    res.status(201).json({ ptoProject, holidayProject });
  } catch (error) {
    console.error('Error creating system projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reports for projects
app.get('/api/reports/projects', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Validate date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }
    
    // Find all projects
    const projects = await Project.find({
      'dateRange.start': { $lte: new Date(endDate) },
      'dateRange.end': { $gte: new Date(startDate) }
    });
    
    // Get time entries for these projects in the date range
    const timeEntries = await TimeEntry.find({
      projectId: { $in: projects.map(p => p._id) },
      'dayEntries.date': {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('projectId', 'projectName clientName');
    
    // Aggregate data for report
    const projectReports = projects.map(project => {
      const projectEntries = timeEntries.filter(entry => 
        entry.projectId && entry.projectId._id.toString() === project._id.toString()
      );
      
      const totalHours = projectEntries.reduce((sum, entry) => {
        // Only count hours within the date range
        const filteredDayEntries = entry.dayEntries.filter(day => 
          new Date(day.date) >= new Date(startDate) && 
          new Date(day.date) <= new Date(endDate)
        );
        
        return sum + filteredDayEntries.reduce((daySum, day) => daySum + day.hours, 0);
      }, 0);
      
      const billedHours = projectEntries
        .filter(entry => entry.isBillable)
        .reduce((sum, entry) => {
          const filteredDayEntries = entry.dayEntries.filter(day => 
            new Date(day.date) >= new Date(startDate) && 
            new Date(day.date) <= new Date(endDate)
          );
          
          return sum + filteredDayEntries.reduce((daySum, day) => daySum + day.hours, 0);
        }, 0);
      
      return {
        projectId: project._id,
        projectName: project.projectName,
        clientName: project.clientName,
        totalHours,
        billedHours,
        percentUtilized: project.maxHours > 0 ? (totalHours / project.maxHours) * 100 : null,
        percentBilled: totalHours > 0 ? (billedHours / totalHours) * 100 : 0
      };
    });
    
    res.json(projectReports);
  } catch (error) {
    console.error('Error generating project report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reports for employees
app.get('/api/reports/employees', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Validate date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }
    
    // Get all time entries in the date range
    const timeEntries = await TimeEntry.find({
      'dayEntries.date': {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('projectId', 'projectName clientName isSystemProject');
    
    // Get all employees who have time entries
    const employeeIds = [...new Set(timeEntries.map(entry => entry.employeeId.toString()))];
    const employees = await User.find({ _id: { $in: employeeIds } });
    
    // Aggregate data for report
    const employeeReports = employees.map(employee => {
      const employeeEntries = timeEntries.filter(entry => 
        entry.employeeId.toString() === employee._id.toString()
      );
      
      // Calculate total hours
      const totalHours = employeeEntries.reduce((sum, entry) => {
        const filteredDayEntries = entry.dayEntries.filter(day => 
          new Date(day.date) >= new Date(startDate) && 
          new Date(day.date) <= new Date(endDate)
        );
        
        return sum + filteredDayEntries.reduce((daySum, day) => daySum + day.hours, 0);
      }, 0);
      
      // Calculate billable hours
      const billedHours = employeeEntries
        .filter(entry => entry.isBillable)
        .reduce((sum, entry) => {
          const filteredDayEntries = entry.dayEntries.filter(day => 
            new Date(day.date) >= new Date(startDate) && 
            new Date(day.date) <= new Date(endDate)
          );
          
          return sum + filteredDayEntries.reduce((daySum, day) => daySum + day.hours, 0);
        }, 0);
      
      // Calculate PTO hours
      const ptoHours = employeeEntries
        .filter(entry => entry.projectId && entry.projectId.projectName === 'PTO')
        .reduce((sum, entry) => {
          const filteredDayEntries = entry.dayEntries.filter(day => 
            new Date(day.date) >= new Date(startDate) && 
            new Date(day.date) <= new Date(endDate)
          );
          
          return sum + filteredDayEntries.reduce((daySum, day) => daySum + day.hours, 0);
        }, 0);
      
      // Calculate holiday hours
      const holidayHours = employeeEntries
        .filter(entry => entry.projectId && entry.projectId.projectName === 'Holiday')
        .reduce((sum, entry) => {
          const filteredDayEntries = entry.dayEntries.filter(day => 
            new Date(day.date) >= new Date(startDate) && 
            new Date(day.date) <= new Date(endDate)
          );
          
          return sum + filteredDayEntries.reduce((daySum, day) => daySum + day.hours, 0);
        }, 0);
      
      return {
        employeeId: employee._id,
        employeeName: employee.name,
        email: employee.email,
        totalHours,
        billedHours,
        ptoHours,
        holidayHours,
        utilization: totalHours > 0 ? (billedHours / totalHours) * 100 : 0
      };
    });
    
    res.json(employeeReports);
  } catch (error) {
    console.error('Error generating employee report:', error);
    res.status(500).json({ error: error.message });
  }
});

// User routes
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    const user = new User({
      name,
      email,
      role: role || 'employee'
    });
    
    const savedUser = await user.save();
    res.status(201).json(savedUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get time entries for a specific project
app.get('/api/timeentries/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, startDate, endDate } = req.query;
    
    // Validate required parameters
    if (!projectId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    
    let query = { projectId };
    
    // Add optional filters
    if (status) {
      query.status = status;
    }
    
    if (startDate && endDate) {
      query.weekStartDate = { $gte: new Date(startDate) };
      query.weekEndDate = { $lte: new Date(endDate) };
    }
    
    const timeEntries = await TimeEntry.find(query)
      .sort({ submittedDate: -1 })
      .populate('employeeId', 'name email');
      
    res.json(timeEntries);
  } catch (error) {
    console.error('Error fetching project time entries:', error);
    res.status(500).json({ error: error.message });
  }
});

// On your server
app.put('/api/timeentries/:timesheetId/status', async (req, res) => {
  try {
    const { timesheetId } = req.params;
    const { status, approvedBy, approvedDate } = req.body;
    
    const updatedTimesheet = await TimeEntry.findByIdAndUpdate(
      timesheetId,
      { 
        status,
        approvedBy,
        approvedDate
      },
      { new: true }
    );
    
    res.json(updatedTimesheet);
  } catch (error) {
    console.error('Error updating timesheet status:', error);
    res.status(500).json({ error: error.message });
  }
});


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
