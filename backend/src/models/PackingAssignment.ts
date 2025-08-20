import mongoose, { Schema } from 'mongoose';

const PackingAssignmentSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['assigned', 'packed'], default: 'assigned' },
  qrCode: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('PackingAssignment', PackingAssignmentSchema);