"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const rawMaterialSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    initialQuantity: { type: Number, required: true },
    processedQuantity: { type: Number, required: true },
    wastage: { type: Number, default: 0 },
    usableQuantity: { type: Number, required: true },
    unit: { type: String, required: true },
    lowStockThreshold: { type: Number, required: true },
});
exports.default = mongoose_1.default.model('RawMaterial', rawMaterialSchema);
