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
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all products
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield Product_1.default.find().sort({ category: 1, productType: 1 });
        res.json(products);
    }
    catch (error) {
        console.error('Failed to fetch products:', error.message);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
}));
// Get product by barcode
router.get('/barcode/:barcode', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Search in product variants for barcode
        const product = yield Product_1.default.findOne({
            'variants.barcode': req.params.barcode
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        // Find the specific variant with this barcode
        const variant = product.variants.find(v => v.barcode === req.params.barcode);
        res.json({
            product,
            variant
        });
    }
    catch (error) {
        console.error('Failed to fetch product by barcode:', error.message);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
}));
// Add new product
router.post('/', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { category, productType, variants, description, lowStockThreshold } = req.body;
    console.log('POST /api/products body:', JSON.stringify(req.body));
    try {
        // Normalize incoming fields
        const cat = typeof category === 'string' ? category.trim() : '';
        const pt = typeof productType === 'string' ? productType.trim() : '';
        const vars = Array.isArray(variants) ? variants : (variants ? [variants] : []);
        if (!cat || !pt || vars.length === 0) {
            return res.status(400).json({
                error: 'Category, product type, and at least one variant are required'
            });
        }
        // Normalize variant fields and check for duplicate barcodes in payload
        const normalizedVariants = vars.map((v) => ({
            size: (v.size || '').toString(),
            price: Number(v.price || 0),
            stock: Number(v.stock || 0),
            barcode: v.barcode ? v.barcode.toString() : ''
        }));
        const barcodes = normalizedVariants.map((v) => v.barcode).filter(Boolean);
        const uniqueBarcodes = new Set(barcodes);
        if (barcodes.length !== uniqueBarcodes.size) {
            return res.status(400).json({
                error: 'Duplicate barcodes found in variants'
            });
        }
        // Check if any barcode already exists in database (global uniqueness)
        for (const variant of normalizedVariants) {
            if (variant.barcode) {
                const existingBarcode = yield Product_1.default.findOne({
                    'variants.barcode': variant.barcode
                });
                if (existingBarcode) {
                    return res.status(400).json({
                        error: `Barcode ${variant.barcode} already exists`
                    });
                }
            }
        }
        // Check if product already exists (same category + productType)
        const existingProduct = yield Product_1.default.findOne({
            category: cat,
            productType: pt
        });
        // If product exists, merge new variants into it instead of rejecting entirely.
        if (existingProduct) {
            // Ensure incoming barcodes don't collide with existing ones (on this product)
            const existingBarcodes = new Set((existingProduct.variants || []).map((v) => v.barcode).filter(Boolean));
            for (const v of normalizedVariants) {
                if (v.barcode && existingBarcodes.has(v.barcode)) {
                    return res.status(400).json({ error: `Barcode ${v.barcode} already exists on this product` });
                }
            }
            // Append new variants
            existingProduct.variants = existingProduct.variants.concat(normalizedVariants);
            // Ensure the existing product has a non-null productId (fixes unique index on productId)
            if (!existingProduct.productId) {
                existingProduct.productId = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
            }
            // Optionally update description/threshold if provided
            if (description != null)
                existingProduct.description = description.toString().trim();
            if (lowStockThreshold != null)
                existingProduct.lowStockThreshold = Number(lowStockThreshold);
            yield existingProduct.save();
            try {
                const io = req.app.get('io');
                (io === null || io === void 0 ? void 0 : io.emit) && io.emit('productUpdated', existingProduct);
            }
            catch (e) {
                console.warn('Failed to emit productUpdated', e);
            }
            return res.status(200).json(existingProduct);
        }
        // Ensure a non-null productId is set to avoid duplicate-null index issues
        const genId = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
        const product = new Product_1.default({
            productId: genId(),
            category: cat,
            productType: pt,
            variants: normalizedVariants,
            description: description === null || description === void 0 ? void 0 : description.toString().trim(),
            lowStockThreshold: lowStockThreshold != null ? Number(lowStockThreshold) : undefined
        });
        yield product.save();
        // Emit real-time event so front-end can update without refresh
        try {
            const io = req.app.get('io');
            (io === null || io === void 0 ? void 0 : io.emit) && io.emit('productCreated', product);
        }
        catch (e) {
            console.warn('Failed to emit productCreated', e);
        }
        res.status(201).json(product);
    }
    catch (error) {
        console.error('Failed to add product:', error.message);
        res.status(500).json({ error: 'Failed to add product' });
    }
}));
// Update product
router.put('/:id', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const product = yield Product_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('Failed to delete product:', error.message);
        res.status(500).json({ error: 'Failed to delete product' });
    }
}));
exports.default = router;
