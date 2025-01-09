const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Trip, Expense } = require('./models/Expense');
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
    console.log('Received trip data:', req.body);  // Add this line
    const trip = new Trip({
      tripName: req.body.tripName,
      employeeName: req.body.employeeName,
      dateRange: req.body.dateRange,
      userEmail: req.body.userEmail,
      totalAmount: 0
    });
    console.log('Created trip object:', trip);  // Add this line
    await trip.save();
    res.json(trip);
  } catch (error) {
    console.log('Error details:', error);  // Add this line
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





const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
