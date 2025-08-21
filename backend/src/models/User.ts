import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'packing'], required: true },
  refreshToken: { type: String },
});

export default mongoose.model('User', userSchema);