const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('=== EMAIL SERVICE INITIALIZATION ===');
console.log('EMAIL_USER1:', process.env.EMAIL_USER1);
console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);
console.log('EMAIL_PASS length:', process.env.EMAIL_PASS?.length);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER1,
    pass: process.env.EMAIL_PASS
  }
});

const sendTestEmail = async () => {
  console.log('=== SENDING TEST EMAIL ===');
  
  try {
    // Test connection first
    console.log('Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful');
    
    // Send email
    console.log('Sending email...');
    const mailOptions = {
      from: process.env.EMAIL_USER1,
      to: process.env.EMAIL_USER1, // Send to yourself
      subject: 'Test Email from Node.js - ' + new Date().toISOString(),
      html: `
        <h2>Test Email</h2>
        <p>This email was sent at: ${new Date().toISOString()}</p>
        <p>From server: ${process.env.NODE_ENV || 'development'}</p>
        <p>If you see this, your email service is working!</p>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
    
  } catch (error) {
    console.error('❌ Email failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
};

const sendExpenseDenialEmail = async ({ email, tripName, reason }) => {
  console.log('=== SENDING EXPENSE DENIAL EMAIL ===');
  console.log('To:', email);
  console.log('Trip:', tripName);
  console.log('Reason:', reason);
  
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER1,
      to: email,
      subject: `Expense Report Denied - ${tripName}`,
      html: `
        <h2>Expense Report Denied</h2>
        <p>Dear ${email},</p>
        <p>Your expense report "<strong>${tripName}</strong>" has been denied.</p>
        <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
        <p>Please review and resubmit with the necessary corrections.</p>
        <br>
        <p>Best regards,<br>Expense Management Team</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Expense denial email sent successfully!');
    console.log('Message ID:', info.messageId);
    
    return info;
    
  } catch (error) {
    console.error('❌ Failed to send expense denial email:', error);
    throw error;
  }
};

module.exports = {
  sendTestEmail,
  sendExpenseDenialEmail
};
