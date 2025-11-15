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
const express_1 = require("express");
const Order_1 = __importDefault(require("../models/Order"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Product_1 = __importDefault(require("../models/Product")); // Import Product model
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const email_1 = require("../utils/email");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield Order_1.default.find().populate('customer');
        res.json(orders);
    }
    catch (error) {
        console.error('Failed to fetch orders:', error.message);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
}));
router.post('/', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const { customerId, items, personalized, paymentMethod } = req.body;
    console.log('POST /api/orders body:', JSON.stringify({ customerId, items, personalized, paymentMethod }));
    try {
        const customer = yield Customer_1.default.findById(customerId);
        if (!customer) {
            console.error('Customer not found:', customerId);
            return res.status(404).json({ error: 'Customer not found' });
        }
        let totalAmount = 0;
        // Validate items and check stock availability
        for (const item of items) {
            console.log(`Validating item:`, JSON.stringify(item));
            if (!item.productId || !item.quantity || !item.unitPrice) {
                console.error('Item validation failed:', item);
                return res.status(400).json({ error: 'All item fields are required' });
            }
            // Check if product exists and has sufficient stock (in variants)
            const product = yield Product_1.default.findById(item.productId);
            if (!product) {
                console.error('Product not found:', item.productId);
                return res.status(404).json({ error: `Product not found: ${item.productName || item.productId}` });
            }
            // Find the matching variant by size/unit and check its stock
            const variantSize = item.unit || '';
            console.log(`Looking for variant with size: "${variantSize}" in product ${item.productId}`);
            console.log(`Product has ${((_a = product.variants) === null || _a === void 0 ? void 0 : _a.length) || 0} variants:`, (_b = product.variants) === null || _b === void 0 ? void 0 : _b.map((v) => ({ size: v.size, stock: v.stock })));
            // Try to find variant by size, but if size is empty or not found, use first variant
            let variant = null;
            if (variantSize && product.variants) {
                variant = product.variants.find((v) => v.size === variantSize);
            }
            if (!variant && product.variants && product.variants.length > 0) {
                console.log(`Variant "${variantSize}" not found, using first variant`);
                variant = product.variants[0];
            }
            if (!variant) {
                console.error(`No variants available for product ${item.productId}`);
                return res.status(400).json({
                    error: `No variants available for ${item.productName}`
                });
            }
            const currentStock = variant.stock || 0;
            console.log(`Variant stock: ${currentStock}, requested: ${item.quantity}`);
            if (currentStock < item.quantity) {
                console.error(`Insufficient stock for ${item.productName}: available ${currentStock}, requested ${item.quantity}`);
                return res.status(400).json({
                    error: `Insufficient stock for ${item.productName}${variantSize ? ` (${variantSize})` : ''}. Available: ${currentStock}, Requested: ${item.quantity}`
                });
            }
            totalAmount += item.quantity * item.unitPrice;
        }
        // Reduce product quantities from the correct variants
        for (const item of items) {
            const pid = item.productId || ((_c = item.product) === null || _c === void 0 ? void 0 : _c._id);
            if (pid) {
                const variantSize = item.unit || '';
                const product = yield Product_1.default.findById(pid);
                if (product && product.variants) {
                    // Find and update the matching variant
                    const variantIndex = variantSize
                        ? product.variants.findIndex((v) => v.size === variantSize)
                        : 0;
                    if (variantIndex >= 0) {
                        product.variants[variantIndex].stock = Math.max(0, (product.variants[variantIndex].stock || 0) - (item.quantity || 0));
                        yield product.save();
                    }
                }
            }
        }
        const order = new Order_1.default({
            customer: customerId,
            items,
            totalAmount,
            pendingPayments: customer.pendingPayments,
            barcode: (0, uuid_1.v4)(),
            status: 'Pending',
            personalized,
            paymentMethod,
        });
        yield order.save();
        const populatedOrder = yield Order_1.default.findById(order._id).populate('customer');
        index_1.io.emit('orderCreated', populatedOrder);
        // Emit product update for real-time stock changes
        for (const item of items) {
            const pid = item.productId || ((_d = item.product) === null || _d === void 0 ? void 0 : _d._id);
            if (pid) {
                const updatedProduct = yield Product_1.default.findById(pid);
                if (updatedProduct) {
                    index_1.io.emit('productUpdated', updatedProduct);
                }
            }
        }
        // Send initial email (make extra data optional)
        if (customer.email) {
            yield (0, email_1.sendInvoiceEmail)(customer.email, 'New Order Confirmation', '<p>Your order is ready for packing.</p>');
        }
        res.status(201).json(populatedOrder);
    }
    catch (error) {
        console.error('Failed to create order:', error.message);
        res.status(500).json({ error: 'Failed to create order' });
    }
}));
router.put('/:id/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status, packer } = req.body;
    try {
        const order = yield Order_1.default.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        order.status = status;
        if (packer)
            order.packer = packer;
        yield order.save();
        const populatedOrder = yield Order_1.default.findById(order._id).populate('customer');
        index_1.io.emit('orderUpdated', populatedOrder);
        res.json(populatedOrder);
    }
    catch (error) {
        console.error('Failed to update order:', error.message);
        res.status(500).json({ error: 'Failed to update order' });
    }
}));
// routes/orders.ts - Fix the update endpoint
router.put('/:id', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = yield Order_1.default.findById(req.params.id);
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        // Allow updating createdAt and shippingAddress and other mutable fields
        const { createdAt, shippingAddress, status, packerId } = req.body;
        if (createdAt) {
            order.createdAt = new Date(createdAt);
        }
        if (shippingAddress) {
            // Ensure shippingAddress exists on order object
            if (!order.shippingAddress) {
                order.shippingAddress = {};
            }
            Object.assign(order.shippingAddress, shippingAddress);
        }
        if (status) {
            order.status = status;
        }
        if (packerId) {
            order.packerId = packerId;
        }
        yield order.save();
        const populatedOrder = yield Order_1.default.findById(order._id).populate('customer');
        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.emit('orderUpdated', populatedOrder);
        }
        res.json(populatedOrder);
    }
    catch (error) {
        console.error('Failed to update order:', error.message);
        res.status(500).json({ error: 'Failed to update order' });
    }
}));
router.put('/:id/assign-packer', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { packerId } = req.body;
    try {
        const order = yield Order_1.default.findById(req.params.id);
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        // store packerId or name depending on your model; keep string for compatibility
        order.packer = packerId || '';
        // also set packerId field
        order.packerId = packerId || undefined;
        yield order.save();
        // Update packer status
        try {
            const Packer = require('../models/Packer').default;
            const p = yield Packer.findById(packerId);
            if (p) {
                p.isActive = true;
                p.lastActive = new Date();
                yield p.save();
                // emit packer update
                try {
                    const ioRef = req.app.get('io');
                    (ioRef === null || ioRef === void 0 ? void 0 : ioRef.emit) && ioRef.emit('packers:updated', p);
                }
                catch (e) {
                    console.warn('emit failed', e);
                }
            }
        }
        catch (e) {
            console.warn('Failed to update packer status', e);
        }
        const token = jsonwebtoken_1.default.sign({ packerId: packerId || '', orderId: order._id }, JWT_SECRET, { expiresIn: '24h' });
        const packingUrl = `${req.get('origin')}/packing?token=${token}`;
        index_1.io.emit('orderUpdated', order);
        // Return the fields the frontend expects
        res.json({ success: true, message: 'Packer assigned', packingToken: token, qrBase64: null, url: packingUrl });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to assign packer' });
    }
}));
router.get('/packing/:token', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const decoded = jsonwebtoken_1.default.verify(req.params.token, JWT_SECRET);
        const { packerId, orderId } = decoded;
        let query = { packer: packerId, status: 'Pending' };
        if (orderId)
            query = { _id: orderId, packer: packerId };
        const orders = yield Order_1.default.find(query).populate('customer');
        res.json({ orders, packerId });
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}));
router.put('/packing/:token/:orderId/packed', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const decoded = jsonwebtoken_1.default.verify(req.params.token, JWT_SECRET);
        const order = yield Order_1.default.findOne({ _id: req.params.orderId, packer: decoded.packerId });
        if (!order)
            return res.status(404).json({ error: 'Order not found or unauthorized' });
        order.status = 'Packed';
        yield order.save();
        const populatedOrder = yield Order_1.default.findById(order._id).populate('customer');
        if (populatedOrder && populatedOrder.customer && populatedOrder.customer.email) {
            yield (0, email_1.sendInvoiceEmail)(populatedOrder.customer.email, `Packed Order Invoice #${order._id}`, '<p>Your order has been packed.</p>');
        }
        index_1.io.emit('orderUpdated', populatedOrder);
        res.json({ message: 'Order marked as packed' });
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}));
// Delete an order by id (admin) - with stock restoration
router.delete('/:id', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = yield Order_1.default.findById(req.params.id);
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        // Restore product quantities when order is deleted
        for (const item of order.items) {
            if (item.productId) {
                yield Product_1.default.findByIdAndUpdate(item.productId, { $inc: { quantity: item.quantity } }, { new: true });
                // Emit product update for real-time stock changes
                const updatedProduct = yield Product_1.default.findById(item.productId);
                if (updatedProduct) {
                    index_1.io.emit('productUpdated', updatedProduct);
                }
            }
        }
        // If there's a linked packing assignment, remove it
        try {
            const PackingAssignment = require('../models/PackingAssignment').default;
            yield PackingAssignment.deleteMany({ orderId: order._id });
        }
        catch (e) {
            // ignore if model not available
            console.warn('PackingAssignment model not available when deleting order:', (e === null || e === void 0 ? void 0 : e.message) || e);
        }
        yield order.deleteOne();
        index_1.io.emit('orderDeleted', { id: req.params.id });
        res.json({ success: true, message: 'Order deleted and stock restored' });
    }
    catch (error) {
        console.error('Failed to delete order:', error.message);
        res.status(500).json({ error: 'Failed to delete order' });
    }
}));
// New endpoint to update order items and adjust stock
router.put('/:id/items', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { items } = req.body;
        const order = yield Order_1.default.findById(req.params.id);
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        // Restore original quantities first
        for (const oldItem of order.items) {
            if (oldItem.productId) {
                yield Product_1.default.findByIdAndUpdate(oldItem.productId, { $inc: { quantity: oldItem.quantity } }, { new: true });
            }
        }
        // Validate new items and check stock
        for (const item of items) {
            if (!item.productId || !item.quantity || !item.unitPrice) {
                return res.status(400).json({ error: 'All item fields are required' });
            }
            const product = yield Product_1.default.findById(item.productId);
            if (!product) {
                return res.status(404).json({ error: `Product not found: ${item.productName || item.productId}` });
            }
            const currentStock = product.quantity || 0;
            if (currentStock < item.quantity) {
                return res.status(400).json({
                    error: `Insufficient stock for ${product.name}${product.unit ? ` (${product.unit})` : ''}. Available: ${currentStock}, Requested: ${item.quantity}`
                });
            }
        }
        // Update quantities with new items
        for (const item of items) {
            yield Product_1.default.findByIdAndUpdate(item.productId, { $inc: { quantity: -item.quantity } }, { new: true });
        }
        // Update order items and recalculate total
        order.items = items;
        order.totalAmount = items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
        yield order.save();
        const populatedOrder = yield Order_1.default.findById(order._id).populate('customer');
        // Emit updates
        index_1.io.emit('orderUpdated', populatedOrder);
        for (const item of items) {
            const updatedProduct = yield Product_1.default.findById(item.productId);
            if (updatedProduct) {
                index_1.io.emit('productUpdated', updatedProduct);
            }
        }
        res.json(populatedOrder);
    }
    catch (error) {
        console.error('Failed to update order items:', error.message);
        res.status(500).json({ error: 'Failed to update order items' });
    }
}));
exports.default = router;
