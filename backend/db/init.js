require('dotenv').config();
const mysql = require('mysql2/promise');

async function initializeDatabase() {
  try {
    console.log('Connecting to MySQL...');
    // Connect without database selected first to create it
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
    });

    console.log('Creating database if it does not exist...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS ecorescue_db;`);
    
    // Switch to the newly created database
    await connection.query(`USE ecorescue_db;`);

    console.log('Creating users table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('restaurant', 'ngo', 'admin') NOT NULL,
        stats_totalDonations INT DEFAULT 0,
        stats_reliabilityScore FLOAT DEFAULT 5.0,
        stats_pickupsCompleted INT DEFAULT 0
      );
    `);

    console.log('Creating posts table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id VARCHAR(255) PRIMARY KEY,
        restaurantId VARCHAR(255) NOT NULL,
        restaurantName VARCHAR(255) NOT NULL,
        foodType VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        pickupDeadline DATETIME NOT NULL,
        instructions TEXT,
        lat FLOAT NOT NULL,
        lng FLOAT NOT NULL,
        status ENUM('Available', 'Claimed', 'Picked Up', 'Completed', 'Expired') DEFAULT 'Available',
        claimedByNgoId VARCHAR(255) DEFAULT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (restaurantId) REFERENCES users(uid),
        FOREIGN KEY (claimedByNgoId) REFERENCES users(uid)
      );
    `);

    console.log('Database and tables initialized successfully!');
    await connection.end();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initializeDatabase();
