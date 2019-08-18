const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Schema = require('validate');
const emailValidator = require("email-validator");

// initialize
admin.initializeApp(functions.config().firebase);
let db = admin.firestore();

/**
 * RSVP endpoints
 */
const rsvp = express();
// parse request body
rsvp.use(bodyParser.json({ type: 'application/*+json' }));
rsvp.use(bodyParser.urlencoded({extended: false}));
// Automatically allow cross-origin requests
// rsvp.use(cors({ origin: true }));
// endpoints
rsvp.post('/send', (req, res) => {
    let rsvpsCollection = db.collection('rsvps');
    let responseData = {
        message: "RSVP successfully added.",
        status: 200
    };

    // validators
    const validateEmail = (val) => {
        return emailValidator.validate(val);
    }

    // rsvp schema
    const rsvp = new Schema({
        email: {
            type: String,
            required: true,
            use: { validateEmail }
        },
        name: {
            type: String,
            required: true,
            use: { isNaN }
        },
        attendance: {
            type: Boolean,
            required: true
        }
    });

    // prepate data
    const data = {
        email:  req.body.email,
        name: req.body.name,
        attendance: req.body.attendance === 'true' ? true : false,
        note: req.body.note
    }

    const errors = rsvp.validate(data);
    console.log(data);
    console.log('errors: ', errors);
    console.log('errors length: ', errors.length);

    if(errors.length === 0) {
         // insert to firestore
        let result = rsvpsCollection.doc(data.email).set(data);
        responseData.data = data;
        responseData.result = result;
    } else {
        responseData.status = 400;
        responseData.data = null;
        responseData.errors = errors;
        responseData.error = errors[0].message;
    }

    res.status(responseData.status).send(responseData);
});

exports.rsvp = functions.region('asia-east2').https.onRequest(rsvp);
