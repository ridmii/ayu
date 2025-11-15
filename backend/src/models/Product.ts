import mongoose, { Schema, Document } from 'mongoose';

export interface IProductVariant {
  size: string;
  price: number;
  stock: number;
  barcode?: string;
}

export interface IProduct extends Document {
  category: string;
  productType: string;
  productId?: string;
  variants: IProductVariant[];
  description?: string;
  lowStockThreshold?: number;
}

const ProductVariantSchema = new Schema({
  size: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  barcode: { type: String }
});

const ProductSchema = new Schema({
  productId: { type: String, unique: true, sparse: true, default: () => (Date.now().toString(36) + Math.random().toString(36).slice(2,8)) },
  // Top-level barcode to avoid collisions with legacy DB unique index on 'barcode'
  barcode: { type: String, unique: true, sparse: true, default: () => ("auto-" + Date.now().toString(36) + Math.random().toString(36).slice(2,8)) },
  category: { type: String, required: true },
  productType: { type: String, required: true },
  variants: [ProductVariantSchema],
  description: { type: String },
  lowStockThreshold: { type: Number, default: 10 }
}, {
  timestamps: true
});

ProductSchema.index({ category: 1, productType: 1 });

export default mongoose.model<IProduct>('Product', ProductSchema);