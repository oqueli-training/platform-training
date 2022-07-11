'use strict';
const bodyParser = require('body-parser');
const express = require('express');

const app = express();
app.enable('trust proxy');

// By default, the Content-Type header of the Task request is set to "application/octet-stream"
// see https://cloud.google.com/tasks/docs/reference/rest/v2beta3/projects.locations.queues.tasks#AppEngineHttpRequest

app.use(bodyParser.raw({type: 'application/octet-stream'}));

const emailService = require('./emailService');

//This answers whenever the / directory is pushed.
app.get('/', (req, res) => {
    // Basic index to verify app is serving
    res.send('This is the Task Handler Service').end();
  });
  
app.post('/log_payload', (req, res) => {
    // Log the request payload
    console.log('Received task with payload: %s', req.body);
    res.send(`Printed task payload: ${req.body}`).end();
});

//this is where the emails are sent
app.post('/send_email', (req, res) => {
    // Log the request payload
    console.log('sending email...');
    const payload = JSON.parse(req.body.toString());
    console.log(payload);
    emailService.sendEmail(payload.email);
    
    res
        .status(200)
        .end();
});

app.get('*', (req, res) => {    
    res.send('OK').end();
});

const PORT = process.env.PORT || 8080;
app.listen(process.env.PORT || 8080, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
});
