const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER1,
    pass: process.env.EMAIL_PASS
  }
});

// Function to send expense denial email
const sendExpenseDenialEmail = async (trip) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER1,
      to: trip.email, // This should be the employee's email
      subject: `Expense Report Denied - ${trip.tripName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">Expense Report Denied</h2>
          
          <p>Dear ${trip.email},</p>
          
          <p>Your expense report <strong>${trip.tripName}</strong> has been <strong style="color: #d32f2f;">denied</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Expense Report Details:</h3>
            <p><strong>Trip Name:</strong> ${trip.tripName}</p>
            ${trip.projectName ? `<p><strong>Project:</strong> ${trip.projectName}</p>` : ''}
            <p><strong>Date Range:</strong> ${new Date(trip.dateRange.start).toLocaleDateString()} - ${new Date(trip.dateRange.end).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> $${trip.totalAmount}</p>
            <p><strong>Status:</strong> ${trip.status}</p>
            <p><strong>Denied by:</strong> ${trip.approvedBy}</p>
            ${trip.reason ? `<p><strong>Reason:</strong> ${trip.reason}</p>` : ''}
          </div>
          
          <p>Please review the feedback and resubmit your expense report with the necessary corrections.</p>
          
          <p>If you have any questions, please contact your supervisor or the HR department.</p>
          
          <p>Best regards,<br>
          HR Department<br>
          Recurring Decimal</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Expense denial email sent to ${trip.email}`);
  } catch (error) {
    console.error('Error sending expense denial email:', error);
    throw error;
  }
};


module.exports = {
  sendExpenseDenialEmail
};
