require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session'); // Import express-session
const connectDB = require('./db'); // Import the connectDB function

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Middleware for session management
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Set a secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure: true if using HTTPS
}));

// Middleware to serve static files from the 'src' folder
app.use(express.static(path.join(__dirname, 'src')));

// Connect to MongoDB
connectDB(); // Call the connection function from db.js

// User Model
const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});
const User = mongoose.model('User', UserSchema);

// Route to serve HTML login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/login.html'));
});

// Sign up route
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Semua field diperlukan.' });
    }

    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });

        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).json({ error: 'Username sudah terdaftar.' });
            }
            if (existingUser.email === email) {
                return res.status(400).json({ error: 'Email sudah terdaftar.' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });

        await newUser.save();
        res.status(201).json({ message: 'Pengguna berhasil didaftarkan.' });
    } catch (error) {
        console.error('Error during signup:', error.message);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Username atau email sudah ada.' });
        }
        res.status(500).json({ error: 'Terjadi kesalahan saat pendaftaran.' });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Username atau password salah' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Username atau password salah' });
        }

        // Set the username in the session
        req.session.username = user.username; // Store username in session

        // Jika login berhasil, kembalikan status OK dan username
        res.status(200).json({ message: 'Login berhasil', username: user.username });
    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat login' });
    }
});

// Example Express.js route to get the username
app.get('/api/get-username', (req, res) => {
    if (req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.json({ username: 'Guest' });
    }
});

// Route for handling responses from Gemini API
app.post('/api/get-gemini-response', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt diperlukan.' });
    }

    const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key tidak ditemukan.' });
    }

    const payload = { contents: [{ parts: [{ text: prompt }] }] };

    try {
        const response = await axios.post(apiUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
            params: { key: apiKey }
        });

        const chatResponse = response.data.candidates[0]?.content?.parts[0]?.text;

        if (!chatResponse) {
            return res.status(500).json({ error: 'Tidak ada respons dari API.' });
        }

        res.json({ response: chatResponse });
    } catch (error) {
        console.error('Error during API request:', error.message);
        res.status(500).json({ error: 'Terjadi kesalahan saat memproses permintaan.' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
