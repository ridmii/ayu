import mongoose, { Schema } from 'mongoose';

const InvoiceSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  totalAmount: { type: Number, required: true },
  pendingAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['card', 'bank', 'cheque', 'credit_card'], required: true },
  isPersonalized: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Invoice', InvoiceSchema);