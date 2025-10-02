import mongoose, { Schema } from 'mongoose';

const ProductSchema = new Schema({
  name: { type: String, required: true },
  productId: { type: String, required: true, unique: true },  // Add: Matches frontend
  unitPrice: { type: Number, required: true },  // Renamed from 'price'
  barcode: { type: String, required: true, unique: true },  // Add: For scanning
  quantity: { type: Number, default: 0 },  // Optional: For stock tracking later
  rawMaterials: [{ materialId: { type: Schema.Types.ObjectId, ref: 'RawMaterial' }, quantityUsed: Number }],  // Keep for future
});

export default mongoose.model('Product', ProductSchema);