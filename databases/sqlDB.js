const { Pool } = require('pg')
const uri = ''; //URI is removed for committing

const pool = new Pool({
  connectionString: uri
});

pool.connect((err, _client, _release) => {
  if (err) {
    console.log('Issue connecting to db')
  } else {
    console.log('Connected to Chronos DB')
  }
});  

module.exports = pool;