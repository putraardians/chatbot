// app.js
require('dotenv').config(); // Pastikan dotenv diimpor di atas
const express = require('express');
const axios = require('axios');
const path = require('path');
const session = require('express-session');
const connectDB = require('./db'); // Mengimpor fungsi connectDB
const { createUser, findUserByUsername } = require('./models/users'); // Mengimpor metode model pengguna
const bcrypt = require('bcrypt'); // Pastikan bcrypt diimpor

const app = express();
const port = process.env.PORT || 3000;

// Middleware untuk parsing JSON
app.use(express.json());

// Middleware untuk manajemen sesi
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Setel kunci rahasia
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure: true jika menggunakan HTTPS
}));

// Middleware untuk melayani file statis dari folder 'src'
app.use(express.static(path.join(__dirname, 'src')));

// Koneksi ke MongoDB
connectDB(); // Panggil fungsi koneksi dari db.js

// Route untuk menyajikan halaman login HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/login.html'));
});

// Route untuk pendaftaran pengguna
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Semua field diperlukan.' });
    }

    try {
        const existingUser = await findUserByUsername(username);

        if (existingUser) {
            return res.status(400).json({ error: 'Username sudah terdaftar.' });
        }

        const newUser = await createUser(username, email, password);
        res.status(201).json({ message: 'Pengguna berhasil didaftarkan.' });
    } catch (error) {
        console.error('Error during signup:', error.message);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Username atau email sudah ada.' });
        }
        res.status(500).json({ error: 'Terjadi kesalahan saat pendaftaran.' });
    }
});

// Route untuk login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await findUserByUsername(username);
        if (!user) {
            return res.status(401).json({ message: 'Username atau password salah' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Username atau password salah' });
        }

        // Set username di sesi
        req.session.username = user.username; // Simpan username di sesi

        // Jika login berhasil, kembalikan status OK dan username
        res.status(200).json({ message: 'Login berhasil', username: user.username });
    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat login' });
    }
});

// Route untuk mendapatkan username
app.get('/api/get-username', (req, res) => {
    if (req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.json({ username: 'Guest' });
    }
});

// Route untuk menangani respons dari API Gemini
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

// Mulai server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
