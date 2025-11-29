"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// models/Order.ts
const mongoose_1 = __importDefault(require("mongoose"));
const orderSchema = new mongoose_1.default.Schema({
    customer: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Customer', required: true },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Packing', 'Packed', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    packerId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Packer' },
    packingAssignment: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'PackingAssignment' },
    items: [{
            productName: { type: String, required: true },
            quantity: { type: Number, required: true },
            unitPrice: { type: Number, required: true },
            productId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Product', required: true },
            unit: { type: String }
        }],
    totalAmount: { type: Number, required: true },
    pendingPayments: { type: Number, default: 0 },
    pendingPaid: { type: Boolean, default: false },
    barcode: { type: String, required: true },
    personalized: { type: Boolean, default: false },
    paymentMethod: { type: String, enum: ['Debit Card', 'Credit Card', 'Cash', 'Other'], required: true },
    packer: { type: String },
    createdAt: { type: Date, default: Date.now },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
    }
});
exports.default = mongoose_1.default.model('Order', orderSchema);
