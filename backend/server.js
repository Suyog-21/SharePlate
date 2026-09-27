require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecorescue_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

// Helper to format user for frontend
const formatUser = (row) => ({
  uid: row.uid,
  name: row.name,
  email: row.email,
  role: row.role,
  stats: {
    totalDonations: row.stats_totalDonations,
    reliabilityScore: row.stats_reliabilityScore,
    pickupsCompleted: row.stats_pickupsCompleted
  }
});

// --- AUTH ENDPOINTS ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const uid = Math.random().toString(36).substring(2, 15);
    
    // Simple query (in a real app, hash password with bcrypt)
    await pool.query(
      `INSERT INTO users (uid, name, email, password, role) VALUES (?, ?, ?, ?, ?)`,
      [uid, name, email, password, role]
    );

    const [rows] = await pool.query(`SELECT * FROM users WHERE uid = ?`, [uid]);
    res.json(formatUser(rows[0]));
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password]);
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json(formatUser(rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- POSTS ENDPOINTS ---

app.get('/api/posts', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM posts ORDER BY createdAt DESC`);
    
    // Convert MySQL datetimes to ISO strings for frontend
    const posts = rows.map(r => ({
      ...r,
      pickupDeadline: new Date(r.pickupDeadline).toISOString(),
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString()
    }));
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { restaurantId, restaurantName, foodType, quantity, pickupDeadline, instructions, location } = req.body;
    const id = Math.random().toString(36).substring(2, 15);
    
    // Convert ISO string back to MySQL DATETIME
    const deadlineDate = new Date(pickupDeadline).toISOString().slice(0, 19).replace('T', ' ');

    await pool.query(
      `INSERT INTO posts (id, restaurantId, restaurantName, foodType, quantity, pickupDeadline, instructions, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, restaurantId, restaurantName, foodType, quantity, deadlineDate, instructions, location.lat, location.lng]
    );

    const [rows] = await pool.query(`SELECT * FROM posts WHERE id = ?`, [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/posts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, claimedByNgoId } = req.body;
    
    let query = `UPDATE posts SET status = ?`;
    let params = [status];

    if (claimedByNgoId !== undefined) {
      query += `, claimedByNgoId = ?`;
      params.push(claimedByNgoId);
    }
    
    query += ` WHERE id = ?`;
    params.push(id);

    await pool.query(query, params);

    // If marked as completed, update stats (simplistic logic)
    if (status === 'Completed') {
      const [postRow] = await pool.query(`SELECT restaurantId, claimedByNgoId, quantity FROM posts WHERE id = ?`, [id]);
      if (postRow.length > 0) {
        const p = postRow[0];
        if (p.claimedByNgoId) {
          await pool.query(`UPDATE users SET stats_pickupsCompleted = stats_pickupsCompleted + 1 WHERE uid = ?`, [p.claimedByNgoId]);
        }
        await pool.query(`UPDATE users SET stats_totalDonations = stats_totalDonations + ? WHERE uid = ?`, [p.quantity, p.restaurantId]);
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
