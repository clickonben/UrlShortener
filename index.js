require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const dns = require('node:dns');
const util = require('util');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const { subHours } = require('date-fns');

const dnsLookup = util.promisify(dns.lookup);

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then (() => {
  console.log("connected to database succesfully")
})
.catch(() => {
  console.log("failed to connect to database")
});

const UrlMapSchema = new mongoose.Schema({
  baseUrl: {
    type: String,
    required: true,
    unique: true
  },
  dateAdded: {
    type: Date,
    required: true
  }
});

let UrlMap = mongoose.model("UrlMap", UrlMapSchema);

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', async (req, res) => {  
  try {
    const url = new URL(req.body.url);
    await dnsLookup(url.hostname);
    let urlMap = await UrlMap.findOne({baseUrl: url});
    if (urlMap === null) {
      urlMap = new UrlMap ({ baseUrl: req.body.url, dateAdded: new Date() })
      await urlMap.save();
    }
    res.json({ original_url: urlMap.baseUrl, short_url: urlMap.id});      
  } catch (error) {
    console.error(error);
    res.json({ error: 'invalid url' });
  } 
});
app.get('/api/shorturl/:id', async (req, res) => {
  try {
    let urlMap = await UrlMap.findById(req.params.id);
    res.redirect(urlMap.baseUrl);  
  } catch (error) {
    console.error(error);    
    res.sendStatus(500,"Server error.")
  }
  
});

(async () => {
  try {
    await UrlMap.deleteMany({dateAdded:subHours(Date(), 3)})
  } catch (error) {
    console.error(error);
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


