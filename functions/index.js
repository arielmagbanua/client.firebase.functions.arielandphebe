const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const emailValidator = require("email-validator");
const axios = require('axios').default;

// initialize
admin.initializeApp(functions.config().firebase);
let db = admin.firestore();
const rsvp = express();

// parse request body
rsvp.use(bodyParser.urlencoded({extended: false}));
rsvp.use(bodyParser.json());

// Automatically allow cross-origin requests
rsvp.use(cors({ origin: true }));

// rsvp endpoints
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

const social = express();

// parse request body
social.use(bodyParser.urlencoded({extended: false}));
social.use(bodyParser.json());

// Automatically allow cross-origin requests
social.use(cors({ origin: true }));

// social.get('/instagram', (req, res) => {
//     return axios.get('https://www.instagram.com/explore/tags/phebeisyursariel/?__a=1')
//         .then((instagramData) => {
//             const media = instagram.data.graphql.hashtag.edge_hashtag_to_media;
// 			const postsCount = media.count;
// 			const posts = media.edges;
            
//             posts.array.forEach((post) => {
//                 tweet.entities.media
//             });

// 			return res.json({
// 				processedPosts: postsCount
// 			});
//         })
//         .catch((error) => {
//             throw new Error(error.message);
//         });
// });

social.post('/twitter/:hashTag', async (req, res) => {
    const hashTag = req.params.hashTag;
    const requestUrl = `https://api.twitter.com/1.1/search/tweets.json?q=%23${hashTag}&result_type=mixed`;

    // bearer token should be retrieve in db
    let statusCollection = db.collection('statuses');
    const variables = await statusCollection.doc('twitter-variables')
        .get()
        .then((doc) => {
            return doc.data();
        }).catch((error) => {
            console.log(error);
        });
    
    const requestData =  {
		headers: {
			Authorization: `Bearer ${variables.bearer_token}`
		}
	};

    const twitterPosts =  await axios.get(requestUrl, requestData)
		.then((tweets) => {
			// only accept tweets with retweeted_status is not defined
			let posts = tweets.data.statuses.filter((tweet) => {
				return typeof tweet.retweeted_status === 'undefined';
			});

			posts = posts.map((tweet) => {
				let media = [];

				if (tweet.entities.media) {
					media = tweet.entities.media.map((medium) => {
						return medium.media_url_https;
					});
				}

				return {
					id: tweet.id,
					text: tweet.text,
					media: media,
					user: {
						id: 'twitter--' + tweet.user.id, // prefixed the actual id with 'twitter'
						name: tweet.user.name,
						screenName: tweet.user.screen_name,
						profileImageUrl: tweet.user.profile_image_url_https,
                        profileUrl: 'https://twitter.com/' + tweet.user.screen_name,
                        type: 'twitter'
					}
				}
			});
            
			return posts;
        });
    
    const usersCollection = db.collection('users');
    const tweetCollection = db.collection('tweets');
        
    // store or update the tweets
    await twitterPosts.forEach(async (tweet) => {
        // insert or update first the user
        let twitterUser = tweet.user;

        let storedTwitterUser = await usersCollection.doc(twitterUser.id);

        let userData = {
            id: twitterUser.id,
            name: twitterUser.name,
            profile_image_url: twitterUser.profileImageUrl,
            profile_url: twitterUser.profileUrl,
            screen_name: twitterUser.screenName,
            type: 'twitter'
        };

        if (storedTwitterUser) {
            // update
            twitterUser = await usersCollection.doc(storedTwitterUser.id)
                .set(userData)
                .then((userDoc) => {
                    return storedTwitterUser;
                });
        } else {
            twitterUser = await usersCollection.add(userData)
                .then((userDoc) => userDoc);
        }

        await tweetCollection.doc(tweet.id.toString())
            .set({
                post_id: tweet.id,
                text: tweet.text,
                media: tweet.media,
                owner: usersCollection.doc(`${twitterUser.id}`)
            })
    });

    await res.json({
        processed: twitterPosts.length
    });
});

// export the functions
exports.rsvp = functions.region('asia-east2').https.onRequest(rsvp);
exports.social = functions.region('asia-east2').https.onRequest(social);
