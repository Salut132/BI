// filepath: /backend/server.js
const express = require('express');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables

const app = express();
const PORT = 3000;

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

app.use(express.json());

// Proxy endpoint to handle API requests
app.post('/api/generateContent', async (req, res) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch data from the API' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});