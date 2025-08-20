import mongoose, { Schema } from 'mongoose';

const ProductSchema = new Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  rawMaterials: [{ materialId: { type: Schema.Types.ObjectId, ref: 'RawMaterial' }, quantityUsed: Number }],
});

export default mongoose.model('Product', ProductSchema);