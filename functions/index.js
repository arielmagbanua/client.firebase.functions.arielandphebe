const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const functions = require('firebase-functions');
// const admin = require('firebase-admin');
// admin.initializeApp();

const rsvp = express();

// Automatically allow cross-origin requests
rsvp.use(cors({ origin: true }));

rsvp.post('/send', (req, res) => {
    res.send({
        message: 'awts'
    });
});

exports.rsvp = functions.region('asia-east2').https.onRequest(rsvp);
