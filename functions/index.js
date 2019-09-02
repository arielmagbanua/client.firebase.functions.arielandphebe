const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const emailValidator = require("email-validator");

// initialize
admin.initializeApp(functions.config().firebase);
let db = admin.firestore();

/**
 * RSVP endpoints
 */
const rsvp = express();
// parse request body
rsvp.use(bodyParser.urlencoded({extended: false}));
rsvp.use(bodyParser.json());
// Automatically allow cross-origin requests
rsvp.use(cors({ origin: true }));
// endpoints
rsvp.post('/add', (req, res) => {
    let rsvpsCollection = db.collection('rsvps');

    let guestAttendance = false;
    if (typeof req.body.attendance === 'boolean') {
        guestAttendance = req.body.attendance;
    } else {
        guestAttendance = req.body.attendance === 'yes' ? true : false;
    }

    // prepate data
    const data = {
        email:  req.body.email,
        name: req.body.name,
        attendance: guestAttendance,
        note: req.body.note
    };

    let responseData = {
        message: "RSVP successfully added. Thank you for responding.",
        status: 200
    };
    if (!emailValidator.validate(data.email)) {
        responseData.status = 400;
        responseData.message = `Invalid email: ${data.email}`;
        console.log(`Invalid email: ${data.email}`)
        return res.status(responseData.status).send(responseData);
    }

    if (!data.name && data.name === '') {
        responseData.status = 400;
        responseData.message = 'Name is required!';
        return res.status(responseData.status).send(responseData);
    }

    // insert to firestore
    console.log('inserting rsvp data...');
    console.log(data);
    return rsvpsCollection.doc(data.email).set(data).then((result) => {
        console.log(result);
        return res.status(responseData.status).send(responseData);
    }).catch((error) => {
        console.log(error);
        responseData.status = 400;
        responseData.message = 'Failed to save the RSVP!';
        return res.status(responseData.status).send(responseData);
    })
});

exports.rsvp = functions.region('asia-east2').https.onRequest(rsvp);
