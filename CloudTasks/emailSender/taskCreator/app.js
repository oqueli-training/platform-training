'use strict';

// sample-metadata:
//   title: Cloud Tasks Create App Engine Target
//   description: Create Cloud Tasks with a Google App Engine Target
//   usage: node createTask.js <projectId> <queueName> <location> <payload> <delayInSeconds>

/**
 * Create a task for a given queue with an arbitrary payload.
 */

const express = require('express');
const app = express();

const dbService = require('./dbService');
const senderTaskQueueName = 'your-queue-name'; //INCLUDE YOUR QUEUE NAME

// [START cloud_tasks_ap engine_create_task]
// Imports the Google Cloud Tasks library.

const {CloudTasksClient} = require('@google-cloud/tasks');

    // Instantiates a client.
const client = new CloudTasksClient();

//This is the function that creates the tasks and send them to the queue
async function createTask(queue,payload = null,path = '/log_payload') {
  
// TODO(developer): Uncomment these lines and replace with your values.
    const project = 'YOUR_PROJECT'// Your GCP Project id
    const location = 'YOUR_REGION'; // The GCP region of your queue
    const inSeconds = 10; // Delay in task execution

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
    const request = {parent: parent, task: task};
    const [response] = await client.createTask(request);
    const name = response.name;
    console.log(`Created task ${name}`);
}
// [END cloud_tasks_appengine_create_task]


process.on('unhandledRejection', err => {
  console.error(err.message);
  process.exitCode = 1;
});

//This will be displayed when the service is deployed.
app.get('/', (req, res) => {
    res.status(200).send('This is the Task Creation Service. Use the /create-email-tasks endpoint to create tasks.').end();
  });

app.get('/create-task', async (req, res) => {
    const email = 'matt_groening@planetexpress';
    await createTask(senderTaskQueueName,{email},'/send_email');
    res.status(200).send('Task on its way').end();
});  

app.get('/create-email-tasks', async (req, res) => {

    const emails = await dbService.getEmailReceivers();

    for(var i = 0; i < emails.length; i ++){
        const email = emails[i];
        console.log('Creating task for email to: %s',email);
        createTask(senderTaskQueueName,{email},'/send_email');
    }
    
    res.status(200).send('The tasks have been created...').end();
});  
// Start the server
const PORT = parseInt(process.env.PORT) || 8080;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
});
// [END gae_node_request_example]

module.exports = app;
