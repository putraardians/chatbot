// models/users.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

// User Model
const User = mongoose.model('User', UserSchema);

// Method to create a new user
const createUser = async (username, email, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    return await newUser.save();
};

// Method to find a user by username
const findUserByUsername = async (username) => {
    return await User.findOne({ username });
};

// Export the User model and methods
module.exports = {
    User,
    createUser,
    findUserByUsername,
};
