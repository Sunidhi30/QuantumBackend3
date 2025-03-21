const bcrypt = require('bcryptjs');


const generateUniqueUsername = async (firstName) => {
    let username;
    let isUnique = false;
  
    while (!isUnique) {
      // Generate username (firstName + random 4-digit number)
      username = `${firstName.toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
  
      // Check if username already exists
      const existingUser = await User.findOne({ username });
      
      if (!existingUser) {
        isUnique = true; // Found a unique username
      }
    }
    
  
    return username;
  };
// Generate a random password
const generatePassword = () => {
  return Math.random().toString(36).slice(-8); // Simple random string generator
};
// Hash a password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Compare a password
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  generatePassword,
  hashPassword,
  generateUniqueUsername,
    comparePassword
};
