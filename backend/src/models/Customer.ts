import mongoose, { Schema } from 'mongoose';

const CustomerSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  pendingPayments: { type: Number, default: 0 },
});

export default mongoose.model('Customer', CustomerSchema);