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
const Product_1 = __importDefault(require("../models/Product"));
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const email_1 = require("../utils/email");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// GET /api/orders - Fixed to include pendingPaid
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield Order_1.default.find().populate('customer').lean();
        // Ensure pendingPaid field is always present
        const ordersWithPendingPaid = orders.map(order => (Object.assign(Object.assign({}, order), { pendingPaid: order.pendingPaid || false })));
        res.json(ordersWithPendingPaid);
    }
    catch (error) {
        console.error('Failed to fetch orders:', error.message);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
}));
// POST /api/orders - Fixed to properly handle pendingPaid
router.post('/', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { customerId, items, personalized, paymentMethod, pendingPaid } = req.body;
    console.log('🔍 BACKEND ORDER CREATION - Received:', {
        customerId,
        itemsCount: items === null || items === void 0 ? void 0 : items.length,
        personalized,
        paymentMethod,
        pendingPaid,
        pendingPaidType: typeof pendingPaid
    });
    try {
        const customer = yield Customer_1.default.findById(customerId);
        if (!customer) {
            console.error('Customer not found:', customerId);
            return res.status(404).json({ error: 'Customer not found' });
        }
        let itemsTotal = 0;
        // Validate items and check stock availability
        for (const item of items) {
            if (!item.productId || !item.quantity || !item.unitPrice) {
                return res.status(400).json({ error: 'All item fields are required' });
            }
            const product = yield Product_1.default.findById(item.productId);
            if (!product) {
                return res.status(404).json({ error: `Product not found: ${item.productName || item.productId}` });
            }
            const variantSize = item.unit || '';
            let variant = null;
            if (variantSize && product.variants) {
                variant = product.variants.find((v) => v.size === variantSize);
            }
            if (!variant && product.variants && product.variants.length > 0) {
                variant = product.variants[0];
            }
            if (!variant) {
                return res.status(400).json({
                    error: `No variants available for ${item.productName}`
                });
            }
            const currentStock = variant.stock || 0;
            if (currentStock < item.quantity) {
                const allowZeroStock = process.env.ALLOW_ZERO_STOCK === 'true';
                if (!allowZeroStock) {
                    return res.status(400).json({
                        error: `Insufficient stock for ${item.productName}. Available: ${currentStock}, Requested: ${item.quantity}`
                    });
                }
            }
            itemsTotal += item.quantity * item.unitPrice;
        }
        // FIXED: Proper pending payment calculation
        const customerPendingAmount = customer.pendingPayments || 0;
        const orderTotalAmount = pendingPaid ? itemsTotal + customerPendingAmount : itemsTotal;
        console.log('💰 BACKEND ORDER CALCULATION:', {
            itemsTotal,
            customerPendingAmount,
            pendingPaid,
            orderTotalAmount
        });
        // Reduce product quantities
        for (const item of items) {
            const product = yield Product_1.default.findById(item.productId);
            if (product && product.variants) {
                const variantSize = item.unit || '';
                const variantIndex = variantSize
                    ? product.variants.findIndex((v) => v.size === variantSize)
                    : 0;
                if (variantIndex >= 0) {
                    product.variants[variantIndex].stock = Math.max(0, (product.variants[variantIndex].stock || 0) - item.quantity);
                    yield product.save();
                }
            }
        }
        const order = new Order_1.default({
            customer: customerId,
            items,
            totalAmount: orderTotalAmount,
            pendingPayments: customerPendingAmount,
            pendingPaid: Boolean(pendingPaid),
            barcode: (0, uuid_1.v4)(),
            status: 'Pending',
            personalized,
            paymentMethod,
        });
        yield order.save();
        console.log('💾 BACKEND ORDER SAVED:', {
            orderId: order._id,
            pendingPaid: order.pendingPaid,
            totalAmount: order.totalAmount,
            pendingPayments: order.pendingPayments
        });
        // Clear customer pending payments if collected
        if (pendingPaid && customerPendingAmount > 0) {
            try {
                customer.pendingPayments = 0;
                yield customer.save();
                console.log(`✅ Cleared customer pending payments: ${customer.name}`);
            }
            catch (e) {
                console.warn('Failed to clear customer pendingPayments:', e && e.message);
            }
        }
        // FIXED: Use .lean() and manually include pendingPaid in the populated response
        const populatedOrder = yield Order_1.default.findById(order._id)
            .populate('customer')
            .lean();
        // Ensure pendingPaid is included in the response
        const responseOrder = Object.assign(Object.assign({}, populatedOrder), { pendingPaid: order.pendingPaid // Explicitly include this field
         });
        console.log('📤 BACKEND RESPONSE ORDER:', {
            orderId: responseOrder._id,
            pendingPaid: responseOrder.pendingPaid,
            totalAmount: responseOrder.totalAmount
        });
        index_1.io.emit('orderCreated', responseOrder);
        // Emit product and customer updates
        for (const item of items) {
            const updatedProduct = yield Product_1.default.findById(item.productId);
            if (updatedProduct) {
                index_1.io.emit('productUpdated', updatedProduct);
            }
        }
        if (pendingPaid && customerPendingAmount > 0) {
            index_1.io.emit('customerUpdated', customer);
        }
        if (customer.email) {
            yield (0, email_1.sendInvoiceEmail)(customer.email, 'New Order Confirmation', '<p>Your order is ready for packing.</p>');
        }
        res.status(201).json(responseOrder);
    }
    catch (error) {
        console.error('❌ Failed to create order:', error.message);
        res.status(500).json({ error: 'Failed to create order' });
    }
}));
// GET /api/orders/:id - Fixed to include pendingPaid
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = yield Order_1.default.findById(req.params.id).populate('customer').lean();
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        // Ensure pendingPaid field is present
        const orderWithPendingPaid = Object.assign(Object.assign({}, order), { pendingPaid: order.pendingPaid || false });
        res.json(orderWithPendingPaid);
    }
    catch (error) {
        console.error('Failed to fetch order:', error.message);
        res.status(500).json({ error: 'Failed to fetch order' });
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
        // FIXED: Include pendingPaid in the response
        const populatedOrder = yield Order_1.default.findById(order._id).populate('customer').lean();
        const responseOrder = Object.assign(Object.assign({}, populatedOrder), { pendingPaid: order.pendingPaid });
        index_1.io.emit('orderUpdated', responseOrder);
        res.json(responseOrder);
    }
    catch (error) {
        console.error('Failed to update order:', error.message);
        res.status(500).json({ error: 'Failed to update order' });
    }
}));
router.put('/:id', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = yield Order_1.default.findById(req.params.id);
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        const { createdAt, shippingAddress, status, packerId } = req.body;
        if (createdAt) {
            order.createdAt = new Date(createdAt);
        }
        if (shippingAddress) {
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
        // FIXED: Include pendingPaid in the response
        const populatedOrder = yield Order_1.default.findById(order._id).populate('customer').lean();
        const responseOrder = Object.assign(Object.assign({}, populatedOrder), { pendingPaid: order.pendingPaid });
        const io = req.app.get('io');
        if (io) {
            io.emit('orderUpdated', responseOrder);
        }
        res.json(responseOrder);
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
        order.packer = packerId || '';
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
        // FIXED: Include pendingPaid in the emitted order
        const populatedOrder = yield Order_1.default.findById(order._id).populate('customer').lean();
        const responseOrder = Object.assign(Object.assign({}, populatedOrder), { pendingPaid: order.pendingPaid });
        index_1.io.emit('orderUpdated', responseOrder);
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
        const orders = yield Order_1.default.find(query).populate('customer').lean();
        // FIXED: Include pendingPaid in packing orders
        const ordersWithPendingPaid = orders.map(order => (Object.assign(Object.assign({}, order), { pendingPaid: order.pendingPaid || false })));
        res.json({ orders: ordersWithPendingPaid, packerId });
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
        // FIXED: Include pendingPaid in the response
        const populatedOrder = yield Order_1.default.findById(order._id).populate('customer').lean();
        const responseOrder = Object.assign(Object.assign({}, populatedOrder), { pendingPaid: order.pendingPaid });
        if (populatedOrder && populatedOrder.customer && populatedOrder.customer.email) {
            yield (0, email_1.sendInvoiceEmail)(populatedOrder.customer.email, `Packed Order Invoice #${order._id}`, '<p>Your order has been packed.</p>');
        }
        index_1.io.emit('orderUpdated', responseOrder);
        res.json({ message: 'Order marked as packed' });
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}));
router.delete('/:id', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = yield Order_1.default.findById(req.params.id);
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        // Restore product quantities when order is deleted
        for (const item of order.items) {
            if (item.productId) {
                yield Product_1.default.findByIdAndUpdate(item.productId, { $inc: { quantity: item.quantity } }, { new: true });
                const updatedProduct = yield Product_1.default.findById(item.productId);
                if (updatedProduct) {
                    index_1.io.emit('productUpdated', updatedProduct);
                }
            }
        }
        try {
            const PackingAssignment = require('../models/PackingAssignment').default;
            yield PackingAssignment.deleteMany({ orderId: order._id });
        }
        catch (e) {
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
        // FIXED: Include pendingPaid in the response
        const populatedOrder = yield Order_1.default.findById(order._id).populate('customer').lean();
        const responseOrder = Object.assign(Object.assign({}, populatedOrder), { pendingPaid: order.pendingPaid });
        index_1.io.emit('orderUpdated', responseOrder);
        for (const item of items) {
            const updatedProduct = yield Product_1.default.findById(item.productId);
            if (updatedProduct) {
                index_1.io.emit('productUpdated', updatedProduct);
            }
        }
        res.json(responseOrder);
    }
    catch (error) {
        console.error('Failed to update order items:', error.message);
        res.status(500).json({ error: 'Failed to update order items' });
    }
}));
exports.default = router;
