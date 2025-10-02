// models/PackingAssignment.ts (updated)
import mongoose, { Schema } from 'mongoose';

const PackingAssignmentSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  packerId: { type: Schema.Types.ObjectId, ref: 'Packer', required: true },
  status: { type: String, enum: ['assigned', 'packed'], default: 'assigned' },
  token: { type: String, required: true, unique: true },
  qrCode: { type: String, required: true }, // Base64 encoded QR code
  expiry: { type: Date, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('PackingAssignment', PackingAssignmentSchema);