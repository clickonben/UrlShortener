require('dotenv').config();
var express = require('express');
var app = express();
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const dns = require('node:dns');
const util = require('util');
let bodyParser = require('body-parser');
mongoose = require("mongoose");

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
      urlMap = new UrlMap ({ baseUrl: req.body.url })
      await urlMap.save();
    }
    res.json({ original_url: urlMap.baseUrl, short_url: urlMap.id});      
  } catch (error) {
    res.json({ error: 'invalid url' });
  } 
});
app.get('/api/shorturl/:id', async (req, res) => {
  let urlMap = await UrlMap.findById(req.params.id);
  res.redirect(urlMap.baseUrl);
});

const options = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH)
}

const PORT = process.env.PORT || 443
const listener = https.createServer(options, app).listen(PORT, console.log(`Node.js listening on port  ${PORT}`))

