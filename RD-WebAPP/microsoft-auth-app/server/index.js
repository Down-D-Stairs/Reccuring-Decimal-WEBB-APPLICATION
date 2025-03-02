require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { validateToken } = require('./middleware/auth');
const { Expense, Trip } = require('./models/Expense');

const app = express();

app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User model
const User = require('./models/User');

app.post('/api/auth/microsoft', async (req, res) => {
  const { accessToken, userDetails } = req.body;
  
  try {
    let user = await User.findOne({ email: userDetails.email });
    
    if (!user) {
      user = new User({
        email: userDetails.email,
        name: userDetails.name,
        microsoftId: userDetails.id
      });
      await user.save();
    }
    
    const jwtToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token: jwtToken, user });
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Protected route example
app.get('/api/protected', validateToken, (req, res) => {
  res.json({ message: 'Access granted to protected resource' });
});

// Create new trip with initial expense
app.post('/api/trips', async (req, res) => {
  try {
    const trip = new Trip({
      tripName: req.body.tripName,
      dateRange: req.body.dateRange,
      email: req.body.email,
      totalAmount: 0
    });
    await trip.save();
    res.json(trip);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

// Add expense to existing trip
app.post('/api/trips/:tripId/expenses', async (req, res) => {
  try {
    const expense = new Expense({
      amount: req.body.amount,
      date: req.body.date,
      vendor: req.body.vendor,
      receipt: req.body.receipt,
      tripId: req.params.tripId
    });
    
    await expense.save();
    
    const trip = await Trip.findById(req.params.tripId);
    trip.expenses.push(expense._id);
    trip.totalAmount += expense.amount;
    await trip.save();
    
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

// Get all trips for a user
app.get('/api/trips', async (req, res) => {
  try {
    const trips = await Trip.find({ email: req.query.email }).populate('expenses');
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// Update trip status (for admins)
app.put('/api/trips/:tripId', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.tripId,
      { status: req.body.status },
      { new: true }
    ).populate('expenses');
    res.json(trip);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
