import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [{
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
  }],
  totalAmount: { type: Number, required: true },
  pendingPayments: { type: Number, default: 0 },
  barcode: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  personalized: { type: Boolean, default: false },
  paymentMethod: { type: String, enum: ['Debit Card', 'Credit Card', 'Cash', 'Other'], required: true },
  packer: { type: String },
});

export default mongoose.model('Order', orderSchema);