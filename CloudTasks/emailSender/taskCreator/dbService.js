require('dotenv').config();

const mysql = require('mysql2');

const createUnixSocketPool = async (config) => {
const dbSocketPath = process.env.DB_SOCKET_PATH || "/cloudsql"

  // Establish a connection to the database
  return await mysql.createPool({
    user: process.env.DB_USER, // e.g. 'my-db-user'
    password: process.env.DB_PASS, // e.g. 'my-db-password'
    database: process.env.DB_NAME, // e.g. 'my-database'
    // If connecting via unix domain socket, specify the path
    socketPath: `${dbSocketPath}/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
    // Specify additional properties here.
    ...config
  });
}

const createTcpPool = async (config) => {
  // Extract host and port from socket address
  const dbSocketAddr = process.env.DB_HOST.split(":")

  // Establish a connection to the database
  return await mysql.createPool({
    user: process.env.DB_USER, // e.g. 'my-db-user'
    password: process.env.DB_PASS, // e.g. 'my-db-password'
    database: process.env.DB_NAME, // e.g. 'my-database'
    host: dbSocketAddr[0], // e.g. '127.0.0.1'
    port: dbSocketAddr[1], // e.g. '3306'
    // ... Specify additional properties here.
    ...config
  });
}

const createPool = async (config) => {
  let pool;
  if (process.env.DB_HOST) {
    pool = await createTcpPool(config);
  } else {
    pool = await createUnixSocketPool(config);
  }
  return pool.promise();
}
  
  const getEmailReceivers = async (startCount=0, limit=1000) => {
    try {
      const pool = await createPool({});
  
      const sql = "SELECT email FROM emails";
      const limits = [startCount, limit];
      const [results, fields] = await pool.query(sql, limits);
  
      const emailsList = results.map(result => { return result.email });

      return emailsList;
    } catch (err) {
      console.log(err);
      throw err;
    }
  };

exports.getEmailReceivers = getEmailReceivers;
