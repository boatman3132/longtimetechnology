# Google Apps Script Contact Form Setup

Follow these steps to connect the website contact form to a Google Apps Script web app that sends email notifications.

1. **Create a script project**
   - Go to [script.google.com](https://script.google.com/) and create a new project.
   - Replace the default code with the sample in the "Apps Script code" section below.

2. **Update email settings**
   - Set the `RECIPIENT_EMAIL` constant inside the script to the mailbox that should receive the contact notifications (for example `louis_hsueh@lttech.com.tw`).
   - Optionally adjust the email subject prefix, body formatting, or additional logging to Sheets.

3. **Deploy the web app**
   - Click *Deploy → New deployment*, choose *Web app*.
   - Set *Execute as* to **Me**.
   - Set *Who has access* to **Anyone** (or "Anyone with the link") so the static site can call it.
   - Deploy and copy the generated Web app URL.

4. **Update the website**
   - Open `contact.html` and replace the `YOUR_DEPLOYMENT_ID` placeholder in the `data-apps-script-url` attribute with the deployment URL you copied.
   - If you redeploy the Apps Script later (e.g., after code changes), remember to update this URL when it changes.

5. **Test**
   - Commit and publish the updated site (e.g., push to GitHub Pages).
   - Submit the contact form in each language and confirm you receive the notification email.
   - Verify responses handle errors gracefully when the script is offline or credentials change.

## Apps Script code

Below is a basic script that matches the JSON payload sent by `contact.html`. Paste it into `Code.gs` (or similar) and adjust as needed.

```javascript
const RECIPIENT_EMAIL = 'louis_hsueh@lttech.com.tw';
const SUBJECT_PREFIX = 'Long Time Technology Contact Form';

function doPost(e) {
  const data = parseRequest(e);
  if (!data) {
    return buildResponse({ success: false, status: 'error', message: 'Invalid payload.' }, 400);
  }

  const { unit, name, tel, mail, title, text, lang } = data;
  if (!name || !tel || !mail || !title || !text) {
    return buildResponse({ success: false, status: 'invalid', message: 'Missing required fields.' }, 200);
  }

  const subject = `${SUBJECT_PREFIX} - ${title}`;
  const body = createBody(data, e);

  GmailApp.sendEmail(RECIPIENT_EMAIL, subject, body, {
    replyTo: mail,
    name: 'Long Time Technology Website',
  });

  return buildResponse({ success: true }, 200);
}

function parseRequest(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return null;
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    console.error('Failed to parse JSON payload', err);
    return null;
  }
}

function createBody(data, e) {
  const timestamp = data.timestamp || new Date().toISOString();
  const lines = [
    'Contact form submission',
    '------------------------',
    `Timestamp: ${timestamp}`,
    `Language: ${(data.lang || 'tw').toUpperCase()}`,
    `Company / Unit: ${data.unit || '(not provided)'}`,
    `Name: ${data.name || ''}`,
    `Phone: ${data.tel || ''}`,
    `Email: ${data.mail || ''}`,
    `Subject: ${data.title || ''}`,
    '',
    'Message:',
    data.text || '',
    '',
    `Source: ${data.source || ''}`,
    `Client IP: ${(e && e.parameter && e.parameter.ip) || ''}`,
    `User Agent: ${(e && e.parameter && e.parameter.userAgent) || ''}`,
  ];
  return lines.join('\n');
}

function buildResponse(payload, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
    .setResponseCode(statusCode);
}
```

Adjust the script if you need file uploads, Google Sheets logging, spam filtering, reCAPTCHA verification, or other workflows.
