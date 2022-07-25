//up top add all required modules and languages
'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongodb = require('mongodb');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const shortId = require('shortid');
const validUrl = require('valid-url');

// Basic Configuration, to use with most apps
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({
  extended: false })
);

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

//in repl.it, create the secret MONGO_URI with URI given by your own MongoDB server (database > connect)
const mySecret = process.env['MONGO_URI']

//connect the app to the MongoDB server
mongoose.connect(mySecret, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000
}); //timeout of 10 secs, can change if wanted

//error message if failure to connect to MongoDB, success message if connected
const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error'));
connection.once('open', () => {
  console.log('MongoDB connection established.')
});

// Your first API endpoint
//shorthand for later
const Schema = mongoose.Schema;

//create a new schema to make sure valid URLs are passed only
const urlSchema = new Schema({
  original_url: String,
  short_url: String
});

//create the model for use later
const URL = mongoose.model('URL', urlSchema);

//create routes to complete challenges
//first route to create the shorturl
app.post('/api/shorturl', async function(req, res) {
  const url = req.body.url;
  const urlCode = shortId.generate();
  const isValidUrl = validUrl.isWebUri(url);
  //format checker
  if (!isValidUrl) {
    res.json({ 
      error: 'invalid url'
    });
  } else {
    try {
      let findOne = await URL.findOne({
        original_url: url
      }); //checks if already in the DB
      if (findOne) {
        res.json({
          original_url: findOne.original_url,
          short_url: findOne.short_url
        });
      } else { //if not new, create new
        findOne = new URL ({
          original_url: url,
          short_url: urlCode
        });
      };
      await findOne.save();
      res.json({
        original_url: findOne.original_url,
        short_url: findOne.short_url
      });
    } catch (err) {
      console.error(err);
      res.status(500).json('Server error.');
    };
  };
});

//route when short URL is generated and redirect
app.get('/api/shorturl/:shorturl?', async function (req, res) {
  try {
    const urlParams = await URL.findOne({
      short_url: req.params.shorturl
    }); //make sure the short url exists
    if (urlParams) {
      return res.redirect(urlParams.original_url); //if it does, redirect to the original URL
    } else {
      return res.status(404).json('No URL Found'); //error if short url not found on the MongoDB created/listed above
    };
  } catch (err) {
      console.error(err);
      res.status(500).json('Server error.');
  };
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});