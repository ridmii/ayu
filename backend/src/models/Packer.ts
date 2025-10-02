// models/Packer.ts
import mongoose, { Schema } from 'mongoose';

const PackerSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String },
});

export default mongoose.model('Packer', PackerSchema);