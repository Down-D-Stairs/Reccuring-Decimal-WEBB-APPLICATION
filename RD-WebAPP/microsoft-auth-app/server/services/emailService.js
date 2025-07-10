const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER1,
    pass: process.env.EMAIL_PASS
  }
});

// Simple test function
const testEmail = async () => {
  try {
    console.log('Testing email connection...');
    console.log('Email User:', process.env.EMAIL_USER1);
    console.log('Email Pass:', process.env.EMAIL_PASS ? 'Set' : 'Not set');
    
    // Test connection
    await transporter.verify();
    console.log('✅ SMTP connection successful');
    
    // Send test email
    const testMailOptions = {
      from: process.env.EMAIL_USER1,
      to: process.env.EMAIL_USER1, // Send to yourself
      subject: 'Test Email - ' + new Date().toLocaleString(),
      html: `
        <h2>Test Email</h2>
        <p>This is a test email sent at ${new Date().toLocaleString()}</p>
        <p>If you receive this, your email service is working!</p>
      `
    };
    
    const info = await transporter.sendMail(testMailOptions);
    console.log('✅ Test email sent successfully');
    console.log('Message ID:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email test failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  transporter,
  testEmail
};
