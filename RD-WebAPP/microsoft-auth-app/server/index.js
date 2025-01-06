require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { validateToken } = require('./middleware/auth');
const { Trip, Expense } = require('./models/Expense');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI);

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server running on port 5000'));
