// test-gmail-api.js
const express = require('express');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const port = 3000;

// Your OAuth credentials from Google Cloud Console
const clientId = '883047304012-j51dcstic4fs1ld8pmto774p9d8l3sie.apps.googleusercontent.com';
const clientSecret = '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';
const redirectUri = 'http://localhost:3000/oauth-callback';
const scopes = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify'
];

// Store tokens in memory (for testing only)
// In production, use a secure database or storage
let tokens = null;

// Create OAuth client
const oAuth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

app.get('/', (req, res) => {
  res.send(`
    <h1>Gmail API Test</h1>
    <a href="/auth">Login with Google</a>
  `);
});

app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'  // Force prompt to ensure refresh token
  });
  res.redirect(authUrl);
});

app.get('/oauth-callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const { tokens: newTokens } = await oAuth2Client.getToken(code);
    tokens = newTokens;
    oAuth2Client.setCredentials(tokens);
    
    console.log('Tokens received:', tokens);
    res.redirect('/gmail-actions');
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/gmail-actions', (req, res) => {
  if (!tokens) {
    return res.redirect('/auth');
  }
  
  res.send(`
    <h1>Gmail API Actions</h1>
    <ul>
      <li><a href="/list-emails">List Emails</a></li>
      <li><a href="/send-test-email">Send Test Email</a></li>
    </ul>
  `);
});

app.get('/list-emails', async (req, res) => {
  if (!tokens) {
    return res.redirect('/auth');
  }
  
  try {
    oAuth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 20,
      labelIds: ['INBOX']
    });
    
    const emails = [];
    
    for (const message of response.data.messages || []) {
      const emailData = await gmail.users.messages.get({
        userId: 'me',
        id: message.id
      });
      
      const headers = emailData.data.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
      const from = headers.find(h => h.name === 'From')?.value || '';
      
      emails.push({
        id: message.id,
        subject,
        from,
        snippet: emailData.data.snippet
      });
    }
    
    res.send(`
      <h1>Recent Emails</h1>
      <a href="/gmail-actions">Back to Actions</a>
      <ul>
        ${emails.map(email => `
          <li>
            <strong>From:</strong> ${email.from}<br>
            <strong>Subject:</strong> ${email.subject}<br>
            <strong>Snippet:</strong> ${email.snippet}
          </li>
        `).join('')}
      </ul>
    `);
  } catch (error) {
    console.error('Error listing emails:', error);
    res.status(500).send(`Error listing emails: ${error.message}`);
  }
});

app.get('/send-test-email', async (req, res) => {
  if (!tokens) {
    return res.redirect('/auth');
  }
  
  try {
    oAuth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    
    // Replace with your email address
    const to = 'mennaahmad711@gmail.com';
    const subject = 'Test Email from Gmail API';
    const body = '<h1>Hello from Gmail API!</h1><p>This is a test email sent from our local application.</p>';
    
    // Create email content
    const emailContent = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body
    ].join('\r\n');
    
    // Encode the email
    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Send the email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });
    
    res.send(`
      <h1>Email Sent!</h1>
      <a href="/gmail-actions">Back to Actions</a>
      <p>Email was sent successfully with ID: ${result.data.id}</p>
    `);
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send(`Error sending email: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});