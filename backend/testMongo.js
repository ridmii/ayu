const mongoose = require('mongoose');

async function testConnection() {
  try {
    await mongoose.connect('mongodb+srv://ridmi:ayu123@ayusys.moyaii5.mongodb.net/ayurvedic-system?retryWrites=true&w=majority', {
      dbName: 'ayurvedic-system',
    });
    console.log('Connected to MongoDB Atlas');
    await mongoose.connection.close();
  } catch (error) {
    console.error('Connection failed:', error.message, error.stack);
  }
}

testConnection();