const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER1,
    pass: process.env.EMAIL_PASS
  }
});

// Test the connection
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ SMTP Connection Error:', error);
  } else {
    console.log('✅ SMTP Connection Successful!');
    
    // Try sending a test email
    const mailOptions = {
      from: process.env.EMAIL_USER1,
      to: 'your-test-email@gmail.com', // Replace with your email
      subject: 'Test Email from Timesheet App',
      text: 'This is a test email to verify the email service is working.'
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('❌ Send Email Error:', error);
      } else {
        console.log('✅ Test Email Sent:', info.response);
      }
    });
  }
});
