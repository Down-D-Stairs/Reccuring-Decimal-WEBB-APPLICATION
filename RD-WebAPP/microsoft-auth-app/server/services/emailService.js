const nodemailer = require('nodemailer');
require('dotenv').config();

// Create Gmail transporter - FIXED: createTransport (not createTransporter)
const transporter = nodemailer.createTransport({
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
      to: timesheet.employeeName, // Employee's work email
      subject: `Timesheet Denied - Week of ${new Date(timesheet.weekStartDate).toLocaleDateString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #721c24;">⚠️ Timesheet Denied</h2>
          </div>
          
          <p>Dear ${timesheet.employeeName},</p>
          
          <p>Your timesheet for the week of <strong>${new Date(timesheet.weekStartDate).toLocaleDateString()} - ${new Date(timesheet.weekEndDate).toLocaleDateString()}</strong> has been <strong style="color: #d32f2f;">denied</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Timesheet Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Week Period:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${new Date(timesheet.weekStartDate).toLocaleDateString()} - ${new Date(timesheet.weekEndDate).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Total Hours:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${timesheet.totalHours} hours</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><span style="color: #d32f2f; font-weight: bold;">${timesheet.status.toUpperCase()}</span></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Denied by:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${timesheet.approverEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Denied on:</strong></td>
                <td style="padding: 8px 0;">${new Date(timesheet.approvedDate).toLocaleDateString()}</td>
              </tr>
            </table>
          </div>
          
          ${timesheet.approvalComments ? `
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #856404;">Reason for Denial:</h4>
              <p style="margin-bottom: 0; color: #856404;">${timesheet.approvalComments}</p>
            </div>
          ` : ''}
          
          <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #0c5460;">Next Steps:</h4>
            <ul style="color: #0c5460; margin-bottom: 0;">
              <li>Review the feedback provided above</li>
              <li>Make necessary corrections to your timesheet</li>
              <li>Resubmit your timesheet for approval</li>
              <li>Contact your supervisor if you have questions</li>
            </ul>
          </div>
          
          <p>If you have any questions about this denial, please contact your supervisor or the HR department.</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            <strong>HR Department</strong><br>
            Recurring Decimal<br>
            <em>This is an automated message. Please do not reply to this email.</em>
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Timesheet denial email sent to ${timesheet.employeeName}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending timesheet denial email:', error);
    return { success: false, error: error.message };
  }
};

// Function to send timesheet approval email
const sendTimesheetApprovalEmail = async (timesheet) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER1,
      to: timesheet.employeeName,
      subject: `Timesheet Approved - Week of ${new Date(timesheet.weekStartDate).toLocaleDateString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #155724;">✅ Timesheet Approved</h2>
          </div>
          
          <p>Dear ${timesheet.employeeName},</p>
          
          <p>Your timesheet for the week of <strong>${new Date(timesheet.weekStartDate).toLocaleDateString()} - ${new Date(timesheet.weekEndDate).toLocaleDateString()}</strong> has been <strong style="color: #28a745;">approved</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Timesheet Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Total Hours:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${timesheet.totalHours} hours</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Approved by:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${timesheet.approverEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Approved on:</strong></td>
                <td style="padding: 8px 0;">${new Date(timesheet.approvedDate).toLocaleDateString()}</td>
              </tr>
            </table>
          </div>
          
          <p>Thank you for submitting your timesheet on time!</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            <strong>HR Department</strong><br>
            Recurring Decimal
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Timesheet approval email sent to ${timesheet.employeeName}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending timesheet approval email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { 
  sendTimesheetDenialEmail,
  sendTimesheetApprovalEmail 
};
