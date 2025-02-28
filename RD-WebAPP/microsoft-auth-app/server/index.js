require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { validateToken } = require('./middleware/auth');
const { Trip, Expense } = require('./models/Expense');
const { Project, TimeEntry} = require('./models/TimeProject');


const app = express();
// Update your CORS configuration
app.use(cors({
  origin: ['https://reccuring-decimal-webb-application.onrender.com'],
  credentials: true
}));
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

// Add these endpoints after your existing routes

// In your server.js, add this to check what's happening
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find();
    console.log('Projects found:', projects); // Add this line
    res.json(projects);
  } catch (error) {
    console.error('Error:', error); // Add this line
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});


// Create new project
app.post('/api/projects', async (req, res) => {
  try {
    const project = new Project({
      projectName: req.body.projectName,
      clientName: req.body.clientName,
      projectTotalHours: 0,
      employeeTimes: []
    });
    await project.save();
    res.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});


// Add time to project
app.post('/api/projects/:projectId/time', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    project.employeeTimes.push({
      employeeName: req.body.employeeName,
      dateRange: req.body.dateRange,
      employeeHours: req.body.employeeHours
    });
    project.projectTotalHours += req.body.employeeHours;
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add time' });
  }
});


// Protected route example
app.get('/api/protected', validateToken, (req, res) => {
  res.json({ message: 'Access granted to protected resource' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server running on port 5000'));


