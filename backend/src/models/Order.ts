// models/Order.ts
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Confirmed', 'Packing', 'Packed', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  packerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Packer' },
  packingAssignment: { type: mongoose.Schema.Types.ObjectId, ref: 'PackingAssignment' },
  items: [{
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
  }],
  totalAmount: { type: Number, required: true },
  pendingPayments: { type: Number, default: 0 },
  barcode: { type: String, required: true },
  personalized: { type: Boolean, default: false },
  paymentMethod: { type: String, enum: ['Debit Card', 'Credit Card', 'Cash', 'Other'], required: true },
  packer: { type: String },
  // ADD THESE MISSING FIELDS:
  createdAt: { type: Date, default: Date.now },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  }
});

export default mongoose.model('Order', orderSchema);