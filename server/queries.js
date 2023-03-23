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
        product: parseInt(req.originalUrl.substring(1)),
        page: page,
        count: limit,
        results: result
      }
      res.status(200).send(result)
    })
  })
}

const getMeta = (req, res) => {
  var productId = 4;

  if (req.params.product_id !== undefined) {
    productId = req.params.product_id;
  }

  pool.query(`select review.rating, review.id from review where product_id=${parseInt(productId)}`)
  .then(data => {
    console.log('1 DATA', data.rows)
    var ratings = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    data.rows.forEach(entry => {
      ratings[entry.rating] += 1;
    })


    pool.query(`select characteristicreviews.characteristic_id, characteristicreviews.value from characteristicreviews where characteristicreviews.review_id=${parseInt(data.rows[0].id)}`)
    .then(result => {
      console.log('2 RES', result.rows)
      var characteristics = {};

      function getCharNames (array, loc, callback) {
        if (loc === array.length) {
          callback(characteristics);
        } else {
          pool.query(`select characteristic.name from characteristic where id=${array[loc].characteristic_id}`)
          .then(name => {
            console.log(name.rows[0].name, {id: array[loc].characteristic_id, value: array[loc].value})
            characteristics[name.rows[0].name] = {id: array[loc].characteristic_id, value: array[loc].value};
            getCharNames(array, (loc+1), callback);
          })
        }
      }

      getCharNames(result.rows, 0, (names) => {
        var sendResult = {
          product_id: productId,
          ratings: ratings,
          characteristics: names
        }
        res.status(200).send(sendResult)
      })
    })
    .catch(err => {
      throw err;
    })
  })
}

const postReview = (req, res) => {
  if (req.query.product_id === undefined) {
    res.status(404).send('No product Id provided')
  }

  var date = new Date().toString();
  var keys = Object.keys(req.body.characteristics);
  var values = Object.values(req.body.characteristics);
  //console.log('PARAMS', req.body, keys, values)

  pool.query('select max (id) from reviewTest')
  .then(result => {
    var newId = result.rows[0].max +1;

    pool.query(`INSERT INTO reviewTest (id, product_id, rating, summary, recommend, reported, reviewer_name, reviewer_email, date)
    VALUES (${newId}, ${req.body.product_id}, ${req.body.rating}, '${req.body.summary}', ${req.body.recommend}, false, '${req.body.reviewer_name}', '${req.body.reviewer_email}', '${date}')`)
    .then(result => {
      //function to post photos to photo table
      const postPhotos = (array, loc, callback) => {
        if (loc === array.length) {
          callback(loc)
        } else {
          pool.query(`INSERT INTO phototest (review_id, url) VALUES (${newId}, '${array[loc]}')`)
          .then(photoData => {
            console.log('photo posted', loc);
            postPhotos(array, (loc + 1), callback);
          })
          .catch(err => {
            if (err) {
              console.log('Photo post error', err)
            }
          })
        }
      }
      //function to post characteristics to characteristics table
      const postChars = (keys, values, loc, callback) => {
        if (loc === keys.length) {
          callback(loc)
        } else {
          pool.query(`INSERT INTO charreviewtest (characteristic_id, review_id, value) VALUES (${parseInt(keys[loc])}, ${newId}, ${values[loc]})`)
          .then(charData => {
            console.log('Characteristic posted');
            postChars(keys, values, (loc+1), callback)
          })
          .catch(err => {
            if (err) {
              console.log('Post chars err', err);
            }
          })
        }
      }

      postPhotos(req.body.photos, 0, (photoReturn) => {
          console.log('All photos posted', photoReturn);
          //res.status(200).send('POST')
          postChars(keys, values, 0, charReturn => {
            console.log('All characteristics posted', charReturn);
            res.status(200).send('Review posted')
          })
      })
    })
    .catch(err => {
      console.log('POST ERR', err)
      res.send('ERROR')
    })
  })
  .catch(err => {
    if (err) {
      console.log('GET ID ERR', err);
    }
  })
}

const markHelpful = (req, res) => {
  if (req.body.review_id === undefined) {
    res.status(404).send('No review Id provided')
  }

  pool.query(`UPDATE reviewtest SET helpfulness=${req.body.helpfulness} WHERE id=${req.body.review_id}`)
  .then(result => {
    console.log('Helpfulness marked');
    res.status(204).send('Helpfulness marked')
  })
  .catch(err => {
    if (err) {
      console.log('Help put err', err);
      res.status(404).send('Helpfulness not marked')
    }
  })
}

const markReported = (req, res) => {
  if (req.body.review_id === undefined) {
    res.status(404).send('No review Id provided')
  }

  pool.query(`UPDATE reviewtest SET reported=true WHERE id=${req.body.review_id}`)
  .then(result => {
    console.log('Review reported');
    res.status(204).send('Review reported')
  })
  .catch(err => {
    if (err) {
      console.log('Report put err', err);
      res.status(404).send('Review not reported')
    }
  })
}

module.exports = {
  getReview,
  getMeta,
  postReview,
  markHelpful,
  markReported
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