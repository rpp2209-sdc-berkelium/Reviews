const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = 3000
const db = require('./queries.js')
const redis = require('redis')
const client = redis.createClient();
const Pool  = require('pg').Pool;
require('dotenv').config();


const pool = new Pool({
  host: 'ec2-3-93-76-148.compute-1.amazonaws.com',
  port: 5432,
  user: 'ubuntu',
  password: 'ubuntu',
  database: 'postgres',
  ssl: false,
})

client.on('error', err => console.log('Redis Client Error', err));

client.connect().then(console.log('client connected'))

function cache(req, res, next) {
  client.get(req.params['0'])
  .then((data) => {
    if (data !== null) {
      res.status(200).send(JSON.parse(data))
    } else {
      next()
    }
  })
}

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)
app.use(express.static('server'))
app.get('/', (request, response) => {
  response.json({ info: 'Node.js, Express, and Postgres API' })
})

app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})

const getReview = (req, res) => {
  var limit = 5;
  var productId = 4;
  var orderBy = 'id';
  var page = 1;

  if (req.params.count !== undefined) {
    limit = req.params.count;
  }
  if (req.params[0] !== undefined) {
    productId = parseInt(req.params['0']);
  }
  if (req.params.sort !== undefined) {
    orderBy = req.params.sort;
  }
  if (req.params.page !== undefined) {
    page = req.params.page;
  }

  pool.query(`SELECT * FROM review WHERE product_id=${parseInt(productId)} ORDER BY ${orderBy} LIMIT ${limit}`)
  .then(data => {

    function getPhotos (reviewArray, loc, callback) {
      if (loc === reviewArray.length) {
        callback(reviewArray);
      } else {
        pool.query(`SELECT * FROM photo WHERE review_id=${parseInt(reviewArray[loc].id)}`)
        .then(results => {
          reviewArray[loc].photo = results.rows;
          getPhotos(reviewArray, (loc + 1), callback);
        })
        .catch(err => {
          console.log('ERROR', err)
        })
      }
    }

    getPhotos(data.rows, 0,  (result) => {
      var modified = {
        product: parseInt(productId),
        page: page,
        count: limit,
        results: result
      }
      client.set(req.params['0'], JSON.stringify(modified))
      res.status(200).send(modified)
    })
  })
}

app.get('/reviews/*', cache, getReview);
app.get('/meta/*', db.getMeta);
app.post('/reviews', db.postReview);
app.put('/reviews/:review_id/helpful', db.markHelpful);
app.put('/reviews/:review_id/report', db.markReported);