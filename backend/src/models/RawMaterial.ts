import mongoose from 'mongoose';

const rawMaterialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  initialQuantity: { type: Number, required: true },
  processedQuantity: { type: Number, required: true },
  wastage: { type: Number, default: 0 },
  usableQuantity: { type: Number, required: true },
  unit: { type: String, required: true },
  lowStockThreshold: { type: Number, required: true },
});

export default mongoose.model('RawMaterial', rawMaterialSchema);