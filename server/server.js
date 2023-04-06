const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = 3000
const db = require('./queries.js')

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.get('/', (request, response) => {
  response.json({ info: 'Node.js, Express, and Postgres API' })
})

app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})

app.get('/reviews/*', db.getReview);
app.get('/meta/*', db.getMeta);
app.post('/reviews', db.postReview);
app.put('/reviews/:review_id/helpful', db.markHelpful);
app.put('/reviews/:review_id/report', db.markReported);

async function setupTable(pool) {
  let createReviewTableQuery = `
    CREATE TABLE IF NOT EXISTS review(
      id BIGINT PRIMARY KEY NOT NULL ,
      product_id INT,
      rating INT,
      date VARCHAR,
      summary VARCHAR,
      body VARCHAR,
      recommend BOOLEAN,
      reported BOOLEAN,
      reviewer_name VARCHAR,
      reviewer_email VARCHAR,
      response VARCHAR,
      helpfulness INT
    );
  `;

  let createPhotoTableQuery = `
    CREATE TABLE IF NOT EXISTS photo(
      photo_id SERIAL PRIMARY KEY NOT NULL,
      review_id INT,
      url VARCHAR
    );
  `;

  let createCharacteristicTableQuery = `
    CREATE TABLE IF NOT EXISTS characteristic(
      id SERIAL PRIMARY KEY NOT NULL ,
      product_id INT,
      name VARCHAR
    );
  `;

  let createCharacteristicReviewsTableQuery = `
    CREATE TABLE IF NOT EXISTS characteristicReviews(
      id SERIAL PRIMARY KEY NOT NULL ,
      characteristic_id INT,
      review_id INT,
      value INT
    );
  `;

  // let populateReviewsTable = `
  //   COPY review
  //   FROM '/Users/homeac/Downloads/reviews.csv'
  //   DELIMITER ','
  //   CSV HEADER;
  // `

  return createReviewTableQuery;
  return createPhotoTableQuery;
  return createCharacteristicTableQuery;
  return createCharacteristicReviewsTableQuery;
}
setupTable(db.pool);