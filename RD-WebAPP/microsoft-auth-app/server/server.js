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
    
    // Then let's see what we get with the userEmail filter
    const userTrips = await Trip.find({ userEmail: req.query.userEmail }).populate('expenses');
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
      employeeName: req.body.employeeName,
      dateRange: req.body.dateRange,
      userEmail: req.body.email,
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
        employeeName: req.body.employeeName,
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

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    console.log('Incoming project request query:', req.query);
    
    // Let's try fetching ALL projects first to see what's in the database
    const allProjects = await Project.find({});
    console.log('All projects in database:', allProjects);
    
    // Then filter by userEmail if provided
    const userProjects = req.query.userEmail 
      ? await Project.find({ userEmail: req.query.userEmail }).populate('employeeTimes')
      : allProjects;
    console.log('Filtered projects:', userProjects);
    
    res.json(userProjects);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new project
app.post('/api/projects', async (req, res) => {
  try {
    console.log('POST /api/projects - Request body:', req.body);
    
    const project = new Project({
      projectName: req.body.projectName,
      clientName: req.body.clientName,
      projectTotalHours: 0,
      userEmail: req.body.email,
      status: 'active'
    });
    
    console.log('Created project object:', project);
    const savedProject = await project.save();
    console.log('Saved project:', savedProject);
    
    res.status(200).json(savedProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add time entry to project
app.post('/api/projects/:projectId/time', async (req, res) => {
  try {
    console.log('Received time entry data:', req.body);
    console.log('Project ID:', req.params.projectId);

    const timeEntry = new TimeEntry({
      employeeName: req.body.employeeName,
      dateRange: req.body.dateRange,
      employeeHours: req.body.employeeHours,
      projectId: req.params.projectId
    });
    await timeEntry.save();
    console.log('Saved time entry:', timeEntry);

    const project = await Project.findById(req.params.projectId);
    console.log('Found project:', project);

    project.employeeTimes.push(timeEntry._id);
    project.projectTotalHours += parseFloat(timeEntry.employeeHours);
    await project.save();
    console.log('Updated project:', project);

    res.json(timeEntry);
  } catch (error) {
    console.error('Error adding time entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update project status
app.put('/api/projects/:projectId/status', async (req, res) => {
  try {
    console.log('Updating project status:', req.params.projectId, req.body.status);
    
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.projectId,
      {
        status: req.body.status
      },
      { new: true }
    ).populate('employeeTimes');

    console.log('Updated project status:', updatedProject);
    res.json(updatedProject);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message || 'Failed to update status' });
  }
});

// Update full project
app.put('/api/projects/:projectId', async (req, res) => {
  try {
    console.log('Updating project:', req.params.projectId, req.body);
    
    // First update the project details
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.projectId,
      {
        projectName: req.body.projectName,
        clientName: req.body.clientName
      },
      { new: true }
    );

    // Then handle time entries separately
    // First remove old entries if requested
    if (req.body.replaceEntries) {
      await TimeEntry.deleteMany({ projectId: req.params.projectId });
      
      // Create new time entries
      if (req.body.timeEntries && req.body.timeEntries.length > 0) {
        const entryPromises = req.body.timeEntries.map(entry => {
          const newEntry = new TimeEntry({
            employeeName: entry.employeeName,
            dateRange: entry.dateRange,
            employeeHours: entry.employeeHours,
            projectId: req.params.projectId
          });
          return newEntry.save();
        });

        const savedEntries = await Promise.all(entryPromises);
        
        // Recalculate total hours
        updatedProject.projectTotalHours = savedEntries.reduce(
          (total, entry) => total + parseFloat(entry.employeeHours), 0
        );
        
        // Update project with new entry IDs
        updatedProject.employeeTimes = savedEntries.map(entry => entry._id);
        await updatedProject.save();
      }
    }

    res.json(updatedProject);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message || 'Failed to update project' });
  }
});




const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
