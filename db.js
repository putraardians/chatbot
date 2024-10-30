// db.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI; // Pastikan ini mengambil dari .env
        console.log(`MongoDB URI: ${uri}`);

        // Koneksi tanpa opsi deprecated
        await mongoose.connect(uri);

        console.log('Koneksi ke MongoDB berhasil');
    } catch (error) {
        console.error('Koneksi ke MongoDB gagal:', error.message);
    }
};

module.exports = connectDB;
