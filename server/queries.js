const Pool  = require('pg').Pool;
require('dotenv').config();


const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: false,
});

const getReview = (req, res) => {
  pool.query(`SELECT * FROM review WHERE product_id=${parseInt(req.originalUrl.substring(1))}`)
  .then(data => {
    data.rows.map(entry => {
      entry.photo = [];
      pool.query(`select * from photo where review_id=${entry.id}`)
      .then(photos => {
        entry.photo = photos.rows
      })
      .then(() => {
        console.log('res', data.rows)
        res.status(200).send(data.rows)
      })
    })
  })
}

module.exports = {
  getReview
}


async function setupTable(client) {
  let createReviewTableQuery = `
    CREATE TABLE IF NOT EXISTS review(
      id BIGINT PRIMARY KEY NOT NULL ,
      product_id INT,
      rating INT,
      date BIGINT,
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
      url VARCHAR,
      CONSTRAINT fk_review FOREIGN KEY(review_id) REFERENCES review(id)
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
      value INT,
      CONSTRAINT fk_review FOREIGN KEY(review_id) REFERENCES review(id),
      CONSTRAINT fx_characteristic FOREIGN KEY(characteristic_id) REFERENCES characteristic(id)
    );
  `;

  let populateReviewsTable = `
    COPY review
    FROM '/Users/homeac/Downloads/reviews.csv'
    DELIMITER ','
    CSV HEADER;
  `

  return
}