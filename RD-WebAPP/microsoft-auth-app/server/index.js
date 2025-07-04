const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Trip, Expense } = require('./models/Expense');
const { Project, TimeEntry } = require('./models/TimeProject');
const Draft = require('./models/Draft');
const Moderator = require('./models/Moderator');
require('dotenv').config();

const { sendStatusEmail } = require('./services/notificationService');
const app = express();

app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

console.log('🔍 Environment check:');
console.log('📍 MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('📍 MONGODB_URI preview:', process.env.MONGODB_URI);

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
      projectName: req.body.projectName || null, // Optional!
      dateRange: req.body.dateRange,
      email: req.body.email,
      totalAmount: 0,
      status: 'pending',
      submittedAt: new Date()
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
      comments:  req.body.comments,
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
        reason: req.body.reason,
        approvedBy: req.body.approvedBy,  // ADD THIS
        approvedAt: new Date()            // ADD THIS
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
        projectName: req.body.projectName, // ADD THIS LINE
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
        comments: expense.comments,
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


// Save/Update draft
app.post('/api/drafts', async (req, res) => {
  try {
    // Check if user already has a draft
    let draft = await Draft.findOne({ email: req.body.email });
    
    if (draft) {
      // Update existing draft
      draft.tripName = req.body.tripName;
      draft.projectName = req.body.projectName || null; // ADD THIS
      draft.dateRange = req.body.dateRange;
      draft.totalAmount = req.body.totalAmount;
      draft.expenses = req.body.expenses;
      draft.updatedAt = new Date();
      await draft.save();
    } else {
      // Create new draft
      draft = new Draft(req.body);
      await draft.save();
    }
    
    res.json(draft);
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// Get user's draft
app.get('/api/drafts/:email', async (req, res) => {
  try {
    const draft = await Draft.findOne({ email: req.params.email });
    
    if (!draft) {
      return res.status(404).json({ message: 'No draft found' });
    }
    
    res.json(draft);
  } catch (error) {
    console.error('Error fetching draft:', error);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

// Delete draft (when user submits the report)
app.delete('/api/drafts/:email', async (req, res) => {
  try {
    await Draft.deleteOne({ email: req.params.email });
    res.json({ message: 'Draft deleted' });
  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({ error: 'Failed to delete draft' });
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
    const { employeeEmail, weekStart, weekEnd } = req.query;
    console.log(`Fetching time entries for employee ${employeeEmail} from ${weekStart} to ${weekEnd}`);
    
    if (!employeeId || !weekStart || !weekEnd) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const timeEntries = await TimeEntry.find({
      employeeName: employeeEmail,
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
      
    console.log('First timeentry approvalComments:', timeEntries[0]?.approvalComments); // ADD THIS LINE
    
    res.json(timeEntries);
  } catch (error) {
    console.error('Error fetching project time entries:', error);
    res.status(500).json({ error: error.message });
  }
});

// On your server
// For updating timesheet status
app.put('/api/timeentries/:timesheetId', async (req, res) => {
  try {
    const { timesheetId } = req.params;
    const { status, comments, reason, approverEmail, approvedDate } = req.body;
    
    console.log('Updating timesheet:', {
      timesheetId,
      status,
      comments,
      reason,
      approverEmail,
      approvedDate
    });
    
    const timesheet = await TimeEntry.findByIdAndUpdate(
      timesheetId,
      { 
        status,
        approvalComments: comments, // Make sure this field exists in your schema
        reason,   // For compatibility
        approverEmail,
        approvedDate
      },
      { new: true }
    );
    
    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }
    
    res.json(timesheet);
  } catch (error) {
    console.error('Error updating timesheet:', error);
    res.status(500).json({ error: error.message });
  }
});


// Add this simple endpoint
app.get('/api/user-project-names', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find projects where user is member or approver
    const projects = await Project.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { approvers: { $regex: email, $options: 'i' } },
            { projectMembers: { $regex: email, $options: 'i' } }
          ]
        }
      ]
    }).select('projectName'); // Only get project names

    // Just return array of project names
    const projectNames = projects.map(p => p.projectName);

    res.json(projectNames);
  } catch (error) {
    console.error('Error fetching project names:', error);
    res.status(500).json({ error: 'Failed to fetch project names' });
  }
});


// Get all moderators (admin only)
app.get('/api/moderators', async (req, res) => {
  try {
    const moderators = await Moderator.find({ isActive: true }).sort({ addedDate: -1 });
    res.json(moderators);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch moderators' });
  }
});

// Add new moderator (admin only)
app.post('/api/moderators', async (req, res) => {
  try {
    const { email, addedBy } = req.body;
    
    const existingModerator = await Moderator.findOne({ email });
    if (existingModerator) {
      return res.status(400).json({ error: 'User is already a moderator' });
    }
    
    const moderator = new Moderator({ email, addedBy });
    await moderator.save();
    res.json(moderator);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add moderator' });
  }
});

// Remove moderator (admin only)
app.delete('/api/moderators/:email', async (req, res) => {
  try {
    const { email } = req.params;
    await Moderator.findOneAndUpdate({ email }, { isActive: false });
    res.json({ message: 'Moderator removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove moderator' });
  }
});

// Check if user is moderator (for frontend)
app.get('/api/moderators/check/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const moderator = await Moderator.findOne({ email, isActive: true });
    res.json({ isModerator: !!moderator });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check moderator status' });
  }
});

// Get projects that a user has submitted timesheets for
app.get('/api/timeentries/user-projects/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Find all time entries for this user and group by project
    const userTimeEntries = await TimeEntry.find({ 
      employeeName: username  // Changed from employeeEmail to employeeName
    }).populate('projectId');
    
    // Group by project and count timesheets
    const projectMap = {};
    userTimeEntries.forEach(entry => {
      if (entry.projectId) {
        const projectId = entry.projectId._id.toString();
        if (!projectMap[projectId]) {
          projectMap[projectId] = {
            _id: entry.projectId._id,
            projectName: entry.projectId.projectName,
            clientName: entry.projectId.clientName,
            timesheetCount: 0
          };
        }
        projectMap[projectId].timesheetCount++;
      }
    });
    
    const projects = Object.values(projectMap);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching user history projects:', error);
    res.status(500).json({ error: 'Failed to fetch user history projects' });
  }
});

// Get user's timesheets for a specific project
app.get('/api/timeentries/user-project/:username/:projectId', async (req, res) => {
  try {
    const { username, projectId } = req.params;
    
    const timesheets = await TimeEntry.find({
      employeeName: username,  // Changed from employeeEmail to employeeName
      projectId: projectId
    }).populate('projectId').sort({ weekStartDate: -1 });
    
    res.json(timesheets);
  } catch (error) {
    console.error('Error fetching user project timesheets:', error);
    res.status(500).json({ error: 'Failed to fetch user project timesheets' });
  }
});


// Get timesheet counts for multiple projects
app.post('/api/timeentries/counts', async (req, res) => {
  try {
    const { projectIds, status = 'submitted' } = req.body;
    
    const counts = {};
    
    await Promise.all(
      projectIds.map(async (projectId) => {
        const count = await TimeEntry.countDocuments({
          projectId,
          status
        });
        counts[projectId] = count;
      })
    );
    
    res.json(counts);
  } catch (error) {
    console.error('Error fetching timesheet counts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get calendar data for a month (total hours per day)
app.get('/api/admin/calendar-data', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }
    
    // Get all time entries in the date range
    const timeEntries = await TimeEntry.find({
      'dayEntries.date': {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('projectId', 'projectName');
    
    // Group by date and calculate total hours
    const calendarData = {};
    
    timeEntries.forEach(entry => {
      entry.dayEntries.forEach(day => {
        const dateStr = new Date(day.date).toISOString().split('T')[0];
        
        // Only include dates within our range
        if (dateStr >= startDate && dateStr <= endDate) {
          if (!calendarData[dateStr]) {
            calendarData[dateStr] = {
              totalHours: 0,
              employeeCount: new Set()
            };
          }
          
          calendarData[dateStr].totalHours += day.hours;
          calendarData[dateStr].employeeCount.add(entry.employeeName);
        }
      });
    });
    
    // Convert Set to count
    Object.keys(calendarData).forEach(date => {
      calendarData[date].employeeCount = calendarData[date].employeeCount.size;
    });
    
    res.json(calendarData);
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed breakdown for a specific day
app.get('/api/admin/day-details', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    const targetDate = new Date(date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // Get all time entries for this specific date
    const timeEntries = await TimeEntry.find({
      'dayEntries.date': {
        $gte: targetDate,
        $lt: nextDate
      }
    }).populate('projectId', 'projectName clientName');
    
    // Group by employee
    const employeeData = {};
    
    timeEntries.forEach(entry => {
      entry.dayEntries.forEach(day => {
        const dayDate = new Date(day.date).toISOString().split('T')[0];
        
        if (dayDate === date && day.hours > 0) {
          if (!employeeData[entry.employeeName]) {
            employeeData[entry.employeeName] = {
              employeeName: entry.employeeName,
              totalHours: 0,
              projects: []
            };
          }
          
          employeeData[entry.employeeName].totalHours += day.hours;
          employeeData[entry.employeeName].projects.push({
            projectName: entry.projectId ? entry.projectId.projectName : 'Unknown Project',
            hours: day.hours
          });
        }
      });
    });
    
    const result = Object.values(employeeData);
    res.json(result);
  } catch (error) {
    console.error('Error fetching day details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get employee data for specified time range
// Get employee timesheet data with status filtering for admin calendar
// Optimize the employee data endpoint
app.get('/api/admin/employee-data', async (req, res) => {
  try {
    const startTime = Date.now(); // Performance tracking
    
    const { employee, range, status } = req.query;
    
    if (!employee) {
      return res.status(400).json({ error: 'Employee parameter is required' });
    }
    
    // Calculate date range (same as before)
    let startDate, endDate;
    const now = new Date();
    
    switch (range) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case '2weeks':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
        endDate = new Date(now);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }
    
    // Build optimized query
    let query = {
      employeeName: employee,
      weekStartDate: { $gte: startDate },
      weekEndDate: { $lte: endDate }
    };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Use aggregation pipeline for better performance
    const result = await TimeEntry.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          as: 'project'
        }
      },
      {
        $group: {
          _id: '$projectId',
          projectName: { $first: { $arrayElemAt: ['$project.projectName', 0] } },
          totalHours: { $sum: '$totalHours' }
        }
      },
      { $match: { totalHours: { $gt: 0 } } },
      { $sort: { totalHours: -1 } }
    ]);
    
    const endTime = Date.now();
    console.log(`Employee data query took ${endTime - startTime}ms`);
    
    res.json(result.map(item => ({
      projectName: item.projectName || 'Unknown Project',
      totalHours: item.totalHours
    })));
    
  } catch (error) {
    console.error('Error fetching employee data:', error);
    res.status(500).json({ error: error.message });
  }
});



// Get project data (all employees working on a specific project)
// Update the project data endpoint to accept time range
// Get project timesheet data with status filtering for admin calendar
// Optimize the project data endpoint
app.get('/api/admin/project-data', async (req, res) => {
  try {
    const startTime = Date.now(); // Performance tracking
    
    const { projectId, range, status } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: 'ProjectId parameter is required' });
    }
    
    // Calculate date range (same logic as employee endpoint)
    let startDate, endDate;
    const now = new Date();
    
    switch (range) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case '2weeks':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
        endDate = new Date(now);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }
    
    // Build optimized query
    let query = {
      projectId: new mongoose.Types.ObjectId(projectId),
      weekStartDate: { $gte: startDate },
      weekEndDate: { $lte: endDate }
    };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Use aggregation pipeline for better performance
    const result = await TimeEntry.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$employeeName',
          employeeName: { $first: '$employeeName' },
          totalHours: { $sum: '$totalHours' }
        }
      },
      { $match: { totalHours: { $gt: 0 } } },
      { $sort: { totalHours: -1 } }
    ]);
    
    const endTime = Date.now();
    console.log(`Project data query took ${endTime - startTime}ms`);
    
    res.json(result.map(item => ({
      employeeName: item.employeeName,
      totalHours: item.totalHours
    })));
    
  } catch (error) {
    console.error('Error fetching project data:', error);
    res.status(500).json({ error: error.message });
  }
});




// Get all unique employees who have submitted timesheets
app.get('/api/admin/employees', async (req, res) => {
  try {
    // Get distinct employee names from time entries
    const employees = await TimeEntry.distinct('employeeName');
    
    // Filter out null/empty values and sort
    const validEmployees = employees
      .filter(name => name && name.trim())
      .sort();
    
    res.json(validEmployees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get summary statistics for admin dashboard
app.get('/api/admin/summary-stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }
    
    // Get all time entries in the date range
    const timeEntries = await TimeEntry.find({
      'dayEntries.date': {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('projectId', 'projectName');
    
    let totalHours = 0;
    let billableHours = 0;
    const uniqueEmployees = new Set();
    const uniqueProjects = new Set();
    
    timeEntries.forEach(entry => {
      uniqueEmployees.add(entry.employeeName);
      if (entry.projectId) {
        uniqueProjects.add(entry.projectId.projectName);
      }
      
      entry.dayEntries.forEach(day => {
        const dayDate = new Date(day.date);
        const dayDateStr = dayDate.toISOString().split('T')[0];
        
        if (dayDateStr >= startDate && dayDateStr <= endDate) {
          totalHours += day.hours;
          if (entry.isBillable) {
            billableHours += day.hours;
          }
        }
      });
    });
    
    const stats = {
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      uniqueEmployees: uniqueEmployees.size,
      uniqueProjects: uniqueProjects.size,
      utilizationRate: totalHours > 0 ? ((billableHours / totalHours) * 100).toFixed(1) : 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get top performers (employees with most hours)
app.get('/api/admin/top-performers', async (req, res) => {
  try {
    const { startDate, endDate, limit = 5 } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }
    
    // Get all time entries in the date range
    const timeEntries = await TimeEntry.find({
      'dayEntries.date': {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    });
    
    // Group by employee and calculate total hours
    const employeeHours = {};
    
    timeEntries.forEach(entry => {
      if (!employeeHours[entry.employeeName]) {
        employeeHours[entry.employeeName] = {
          employeeName: entry.employeeName,
          totalHours: 0,
          billableHours: 0
        };
      }
      
      entry.dayEntries.forEach(day => {
        const dayDate = new Date(day.date);
        const dayDateStr = dayDate.toISOString().split('T')[0];
        
        if (dayDateStr >= startDate && dayDateStr <= endDate) {
          employeeHours[entry.employeeName].totalHours += day.hours;
          if (entry.isBillable) {
            employeeHours[entry.employeeName].billableHours += day.hours;
          }
        }
      });
    });
    
    // Sort by total hours and limit results
    const topPerformers = Object.values(employeeHours)
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, parseInt(limit));
    
    res.json(topPerformers);
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get project utilization data
app.get('/api/admin/project-utilization', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }
    
    // Get all active projects
    const projects = await Project.find({ isActive: true });
    
    // Get time entries for the date range
    const timeEntries = await TimeEntry.find({
      'dayEntries.date': {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('projectId', 'projectName maxHours');
    
    // Calculate utilization for each project
    const projectUtilization = {};
    
    projects.forEach(project => {
      projectUtilization[project._id] = {
        projectId: project._id,
        projectName: project.projectName,
        maxHours: project.maxHours,
        actualHours: 0,
        utilizationPercent: 0
      };
    });
    
    timeEntries.forEach(entry => {
      if (entry.projectId && projectUtilization[entry.projectId._id]) {
        entry.dayEntries.forEach(day => {
          const dayDate = new Date(day.date);
          const dayDateStr = dayDate.toISOString().split('T')[0];
          
          if (dayDateStr >= startDate && dayDateStr <= endDate) {
            projectUtilization[entry.projectId._id].actualHours += day.hours;
          }
        });
      }
    });
    
    // Calculate utilization percentages
    Object.values(projectUtilization).forEach(project => {
      if (project.maxHours > 0) {
        project.utilizationPercent = ((project.actualHours / project.maxHours) * 100).toFixed(1);
      }
    });
    
    const result = Object.values(projectUtilization)
      .filter(project => project.actualHours > 0)
      .sort((a, b) => b.actualHours - a.actualHours);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching project utilization:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get timesheet counts for multiple projects (for the pending timesheets column)
app.post('/api/timeentries/counts', async (req, res) => {
  try {
    const { projectIds, status = 'submitted' } = req.body;
    
    const counts = {};
    
    await Promise.all(
      projectIds.map(async (projectId) => {
        const count = await TimeEntry.countDocuments({
          projectId,
          status
        });
        counts[projectId] = count;
      })
    );
    
    res.json(counts);
  } catch (error) {
    console.error('Error fetching timesheet counts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get employee timesheet data with status filtering for admin calendar
app.get('/api/admin/employee-data', async (req, res) => {
  try {
    const { employee, range, status } = req.query;
    
    if (!employee) {
      return res.status(400).json({ error: 'Employee parameter is required' });
    }
    
    // Calculate date range
    let startDate, endDate;
    const now = new Date();
    
    switch (range) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case '2weeks':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
        endDate = new Date(now);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }
    
    // Build query
    let query = {
      employeeName: employee,
      weekStartDate: { $gte: startDate },
      weekEndDate: { $lte: endDate }
    };
    
    // Add status filter if not 'all'
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const timeEntries = await TimeEntry.find(query).populate('projectId');
    
    // Group by project and calculate totals
    const projectBreakdown = {};
    let totalHours = 0;
    
    timeEntries.forEach(entry => {
      const projectName = entry.projectId ? entry.projectId.projectName : 'Unknown Project';
      
      if (!projectBreakdown[projectName]) {
        projectBreakdown[projectName] = 0;
      }
      
      projectBreakdown[projectName] += entry.totalHours;
      totalHours += entry.totalHours;
    });
    
    res.json({
      employee,
      totalHours,
      projectBreakdown,
      timeEntries,
      dateRange: { startDate, endDate },
      statusFilter: status || 'all'
    });
    
  } catch (error) {
    console.error('Error fetching employee data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get project timesheet data with status filtering for admin calendar
app.get('/api/admin/project-data', async (req, res) => {
  try {
    const { projectId, range, status } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: 'ProjectId parameter is required' });
    }
    
    // Calculate date range
    let startDate, endDate;
    const now = new Date();
    
    switch (range) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case '2weeks':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
        endDate = new Date(now);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }
    
    // Build query
    let query = {
      projectId: projectId,
      weekStartDate: { $gte: startDate },
      weekEndDate: { $lte: endDate }
    };
    
    // Add status filter if not 'all'
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const timeEntries = await TimeEntry.find(query).populate('projectId');
    
    // Group by employee and calculate totals
    const employeeBreakdown = {};
    let totalHours = 0;
    
    timeEntries.forEach(entry => {
      const employeeName = entry.employeeName;
      
      if (!employeeBreakdown[employeeName]) {
        employeeBreakdown[employeeName] = 0;
      }
      
      employeeBreakdown[employeeName] += entry.totalHours;
      totalHours += entry.totalHours;
    });
    
    const project = await Project.findById(projectId);
    
    res.json({
      project: project ? project.projectName : 'Unknown Project',
      totalHours,
      employeeBreakdown,
      timeEntries,
      dateRange: { startDate, endDate },
      statusFilter: status || 'all'
    });
    
  } catch (error) {
    console.error('Error fetching project data:', error);
    res.status(500).json({ error: error.message });
  }
});




// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
