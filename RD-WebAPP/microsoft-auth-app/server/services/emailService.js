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

// Function to send timesheet denial email
const sendTimesheetDenialEmail = async (timesheet) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER1,
      to: timesheet.employeeName, // This should be the employee's email
      subject: `Timesheet Denied - Week of ${new Date(timesheet.weekStartDate).toLocaleDateString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">Timesheet Denied</h2>
          
          <p>Dear ${timesheet.employeeName},</p>
          
          <p>Your timesheet for the week of <strong>${new Date(timesheet.weekStartDate).toLocaleDateString()} - ${new Date(timesheet.weekEndDate).toLocaleDateString()}</strong> has been <strong style="color: #d32f2f;">denied</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Timesheet Details:</h3>
            <p><strong>Total Hours:</strong> ${timesheet.totalHours}</p>
            <p><strong>Status:</strong> ${timesheet.status}</p>
            <p><strong>Denied by:</strong> ${timesheet.approverEmail}</p>
            ${timesheet.approvalComments ? `<p><strong>Reason:</strong> ${timesheet.approvalComments}</p>` : ''}
          </div>
          
          <p>Please review the feedback and resubmit your timesheet with the necessary corrections.</p>
          
          <p>If you have any questions, please contact your supervisor or the HR department.</p>
          
          <p>Best regards,<br>
          HR Department<br>
          Recurring Decimal</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Timesheet denial email sent to ${timesheet.employeeName}`);
  } catch (error) {
    console.error('Error sending timesheet denial email:', error);
    throw error;
  }
};

module.exports = {
  sendTimesheetDenialEmail
};
