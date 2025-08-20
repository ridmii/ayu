import mongoose, { Schema } from 'mongoose';

const OrderSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [{ productId: { type: Schema.Types.ObjectId, ref: 'Product' }, quantity: Number }],
  personalizedItems: [{ name: String, quantity: Number, price: Number, rawMaterials: [{ materialId: { type: Schema.Types.ObjectId, ref: 'RawMaterial' }, quantityUsed: Number }] }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'packed', 'invoiced', 'paid'], default: 'pending' },
  packingEmployeeId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Order', OrderSchema);