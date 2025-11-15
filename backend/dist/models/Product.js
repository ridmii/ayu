"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ProductVariantSchema = new mongoose_1.Schema({
    size: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    barcode: { type: String }
});
const ProductSchema = new mongoose_1.Schema({
    productId: { type: String, unique: true, sparse: true, default: () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)) },
    // Top-level barcode to avoid collisions with legacy DB unique index on 'barcode'
    barcode: { type: String, unique: true, sparse: true, default: () => ("auto-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)) },
    category: { type: String, required: true },
    productType: { type: String, required: true },
    variants: [ProductVariantSchema],
    description: { type: String },
    lowStockThreshold: { type: Number, default: 10 }
}, {
    timestamps: true
});
ProductSchema.index({ category: 1, productType: 1 });
exports.default = mongoose_1.default.model('Product', ProductSchema);
