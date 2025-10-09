"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
        }],
    totalAmount: { type: Number, required: true },
    pendingPayments: { type: Number, default: 0 },
    barcode: { type: String, required: true },
    personalized: { type: Boolean, default: false },
    paymentMethod: { type: String, enum: ['Debit Card', 'Credit Card', 'Cash', 'Other'], required: true },
    packer: { type: String }
});
exports.default = mongoose_1.default.model('Order', orderSchema);
