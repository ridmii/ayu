"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Product_1 = __importDefault(require("../models/Product"));
const auth_1 = require("../middleware/auth"); // Keep, but optional for GET
const router = express_1.default.Router();
// Get all products
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield Product_1.default.find().populate('rawMaterials.materialId');
        res.json(products);
    }
    catch (error) {
        console.error('Failed to fetch products:', error.message);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
}));
// Get product by barcode (for scanner lookup)
router.get('/barcode/:barcode', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const product = yield Product_1.default.findOne({ barcode: req.params.barcode });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        console.error('Failed to fetch product by barcode:', error.message);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
}));
// Add product (updated fields)
router.post('/', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, productId, unitPrice, barcode, quantity = 0, rawMaterials = [] } = req.body; // Match frontend + defaults
    try {
        if (!name || !productId || !unitPrice || !barcode) {
            return res.status(400).json({ error: 'Name, Product ID, Unit Price, and Barcode are required' });
        }
        const existingBarcode = yield Product_1.default.findOne({ barcode });
        if (existingBarcode) {
            return res.status(400).json({ error: 'Barcode already exists' });
        }
        const product = new Product_1.default({ name, productId, unitPrice, barcode, quantity, rawMaterials });
        yield product.save();
        res.status(201).json(product);
    }
    catch (error) {
        console.error('Failed to add product:', error.message);
        res.status(500).json({ error: 'Failed to add product' });
    }
}));
// Update product
router.put('/:id', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, productId, unitPrice, barcode, quantity, rawMaterials } = req.body;
    try {
        const product = yield Product_1.default.findByIdAndUpdate(req.params.id, { name, productId, unitPrice, barcode, quantity, rawMaterials }, { new: true, runValidators: true });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        console.error('Failed to update product:', error.message);
        res.status(500).json({ error: 'Failed to update product' });
    }
}));
// Delete product
router.delete('/:id', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const product = yield Product_1.default.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted' });
    }
    catch (error) {
        console.error('Failed to delete product:', error.message);
        res.status(500).json({ error: 'Failed to delete product' });
    }
}));
exports.default = router;
