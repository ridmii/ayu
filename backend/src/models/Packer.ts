// models/Packer.ts
import mongoose, { Schema } from 'mongoose';

const PackerSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String },
  isActive: { type: Boolean, default: false },
  avatar: { type: String },
  lastActive: { type: Date }
});

export default mongoose.model('Packer', PackerSchema);