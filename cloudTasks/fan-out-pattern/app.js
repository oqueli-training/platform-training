'use strict';

const express = require('express');
const app = express();
app.enable('trust proxy');

var bodyParser = require('body-parser');

const emailService = require('./emailService');
const dbService = require('./dbService');

const project = 'my-pet-project-285907'; // Your GCP Project id
const location = 'asia-east2'; // The GCP region of your queue
const generatorTaskQueueName = 'email-task-generator';
const senderTaskQueueName = 'email-sender';

const subject = `You've got mail!`;
const emailBody = 'Hello!';

/**
 * Create a task for a given queue with an arbitrary payload.
 */
async function createTask(
  queue = 'default-queue', // Name of your Queue
  payload = null, // The task HTTP request body
  path = '/',
  inSeconds = 0 // Delay in task execution
) {
  const {CloudTasksClient} = require('@google-cloud/tasks');

  // Instantiates a client.
  const client = new CloudTasksClient();

  // Construct the fully qualified queue name.
  const parent = client.queuePath(project, location, queue);

  const task = {
    appEngineHttpRequest: {
      httpMethod: 'POST',
      relativeUri: path,
    },
  };

  if (payload) {
    task.appEngineHttpRequest.body = Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  if (inSeconds) {
    // The time when the task is scheduled to be attempted.
    task.scheduleTime = {
      seconds: inSeconds + Date.now() / 1000,
    };
  }

  console.log('Sending task:');
  console.log(task);
  // Send create task request.
  const request = {parent, task};
  const [response] = await client.createTask(request);
  const name = response.name;
  console.log(`Created task ${name}`);
}

const rawBodySaver = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};

app.use(bodyParser.json({ verify: rawBodySaver }));
app.use(bodyParser.urlencoded({ verify: rawBodySaver, extended: true }));
app.use(bodyParser.raw({ verify: rawBodySaver, type: function () { return true } }));

app.get('/', async (req, res) => {
  res
    .status(200)
    .send('Hello World!')
    .end();
});

app.get('/send-emails-normally', async (req, res) => {
  // Get emails from Database
  const emails = await dbService.getEmailReceivers();

  // Loop through emails and send email for each
  emails.forEach(email => {
    emailService.sendEmail(email, subject, emailBody);
  });

  res
    .status(200)
    .send('Emails sent')
    .end();
});

app.get('/create-send-email-tasks', async (req, res) => {
  // Get emails from Database
  const emails = await dbService.getEmailReceivers();

  // Loop through emails and create a task for each
  for (var i = 0; i < emails.length; i++) {
    const email = emails[i];
    await createTask(senderTaskQueueName, { email, subject, emailBody }, '/send-email');
  }

  res
    .status(200)
    .send('Tasks created')
    .end();
});

app.post('/send-email', (req, res) => {
  console.log('body', req);
  const emailAddress = req.body.email;
  const emailSubject = req.body.subject;
  const emailContent = req.body.emailBody;

  emailService.sendEmail(emailAddress, emailSubject, emailContent);

  res
    .status(200)
    .send('Emails sent')
    .end();
});

app.get('/send-emails-fan-out', async (req, res) => {
  // Get total count of receivers so we know how many tasks to create
  const totalEmails = await dbService.getTotalNumberOfEmails();

  // We'll send 100 emails per task
  const batchSize = 100;
  let startCount = 0;

  // If there are 1,000 emails, then the batch size will be 10 batches of 100 each
  const numberOfBatches = Math.round(totalEmails / batchSize);

  for (let i = 0; i < numberOfBatches; i++) {
    await createTask(generatorTaskQueueName, { startCount, batchSize }, '/generate-send-email-tasks');
    startCount += batchSize;
  }

  res
    .status(200)
    .send('Fan out email tasks created')
    .end();
});

app.post('/generate-send-email-tasks', async (req, res) => {
  const startCount = req.body.startCount;
  const limit = req.body.batchSize;

  // Get emails from Database
  const emails = await dbService.getEmailReceivers(startCount, limit);

  // Loop through emails and create a task for each
  for (var i = 0; i < emails.length; i++) {
    const email = emails[i];
    await createTask(senderTaskQueueName, { email, subject, emailBody }, '/send-email');
  }

  res
    .status(200)
    .send('Emails sent')
    .end();
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

module.exports = app;
