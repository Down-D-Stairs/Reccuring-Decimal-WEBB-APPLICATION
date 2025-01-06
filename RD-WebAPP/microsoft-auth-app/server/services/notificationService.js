const { Client } = require('@microsoft/microsoft-graph-client');

const sendStatusEmail = async (token, tripData) => {
  const client = Client.init({
    authProvider: (done) => done(null, token)
  });

  const message = {
    message: {
      subject: `Expense Report ${tripData.status.toUpperCase()}`,
      body: {
        contentType: 'HTML',
        content: `
          <h2>Your expense report has been ${tripData.status}</h2>
          <p>Report Name: ${tripData.tripName}</p>
          <p>Total Amount: $${tripData.totalAmount}</p>
          ${tripData.reason ? `<p>Reason: ${tripData.reason}</p>` : ''}
        `
      },
      toRecipients: [{ emailAddress: { address: tripData.email }}]
    }
  };

  return client.api('/me/sendMail').post(message);
};

module.exports = { sendStatusEmail };
