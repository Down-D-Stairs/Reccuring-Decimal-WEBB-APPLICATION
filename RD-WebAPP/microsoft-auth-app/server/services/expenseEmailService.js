const nodemailer = require('nodemailer');
// Add debug logging
console.log('🔍 Email service environment check:');
console.log('EMAIL_USER1:', process.env.EMAIL_USER1);
console.log('EMAIL_PASS exists:', process.env.EMAIL_PASS ? 'YES' : 'NO');

// Create Gmail transporter - FIXED: createTransport (not createTransporter)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Function to send expense denial email
const sendExpenseDenialEmail = async (trip) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER1,
      to: trip.email,
      subject: `Expense Report Denied - ${trip.tripName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #721c24;">⚠️ Expense Report Denied</h2>
          </div>
          
          <p>Dear ${trip.email},</p>
          
          <p>Your expense report <strong>"${trip.tripName}"</strong> has been <strong style="color: #d32f2f;">denied</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Expense Report Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Trip Name:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${trip.tripName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Date Range:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${new Date(trip.dateRange.start).toLocaleDateString()} - ${new Date(trip.dateRange.end).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Total Amount:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">$${trip.totalAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><span style="color: #d32f2f; font-weight: bold;">${trip.status.toUpperCase()}</span></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Denied by:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${trip.approvedBy}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Denied on:</strong></td>
                <td style="padding: 8px 0;">${new Date(trip.approvedAt).toLocaleDateString()}</td>
              </tr>
            </table>
          </div>
          
          ${trip.reason ? `
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #856404;">Reason for Denial:</h4>
              <p style="margin-bottom: 0; color: #856404;">${trip.reason}</p>
            </div>
          ` : ''}
          
          <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #0c5460;">Next Steps:</h4>
            <ul style="color: #0c5460; margin-bottom: 0;">
              <li>Review the feedback provided above</li>
              <li>Make necessary corrections to your expense report</li>
              <li>Resubmit your expense report for approval</li>
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
    console.log(`Expense denial email sent to ${trip.email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending expense denial email:', error);
    return { success: false, error: error.message };
  }
};

// Function to send expense approval email
const sendExpenseApprovalEmail = async (trip) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER1,
      to: trip.email,
      subject: `Expense Report Approved - ${trip.tripName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #155724;">✅ Expense Report Approved</h2>
          </div>
          
          <p>Dear ${trip.email},</p>
          
          <p>Your expense report <strong>"${trip.tripName}"</strong> has been <strong style="color: #28a745;">approved</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Expense Report Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Total Amount:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">$${trip.totalAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Approved by:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${trip.approvedBy}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Approved on:</strong></td>
                <td style="padding: 8px 0;">${new Date(trip.approvedAt).toLocaleDateString()}</td>
              </tr>
            </table>
          </div>
          
          <p>Your expense report will be processed for reimbursement.</p>
          
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
    console.log(`Expense approval email sent to ${trip.email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending expense approval email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { 
  sendExpenseDenialEmail,
  sendExpenseApprovalEmail 
};
