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
    const { customerId, items, personalized, paymentMethod } = req.body;
    try {
        const customer = yield Customer_1.default.findById(customerId);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        let totalAmount = 0;
        for (const item of items) {
            if (!item.productName || !item.quantity || !item.unitPrice) {
                return res.status(400).json({ error: 'All item fields are required' });
            }
            totalAmount += item.quantity * item.unitPrice;
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
router.put('/:id/assign-packer', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { packerId } = req.body;
    try {
        const order = yield Order_1.default.findById(req.params.id);
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        // store packerId or name depending on your model; keep string for compatibility
        order.packer = packerId || '';
        yield order.save();
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
// Delete an order by id (admin)
router.delete('/:id', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = yield Order_1.default.findById(req.params.id);
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        // If there's a linked packing assignment, remove it
        try {
            const PackingAssignment = require('../models/PackingAssignment').default;
            yield PackingAssignment.deleteMany({ orderId: order._id });
        }
        catch (e) {
            // ignore if model not available
            console.warn('PackingAssignment model not found when deleting order:', (e === null || e === void 0 ? void 0 : e.message) || e);
        }
        yield order.deleteOne();
        const populatedOrder = yield Order_1.default.findById(req.params.id); // should be null
        index_1.io.emit('orderDeleted', { id: req.params.id });
        res.json({ success: true, message: 'Order deleted' });
    }
    catch (error) {
        console.error('Failed to delete order:', error.message);
        res.status(500).json({ error: 'Failed to delete order' });
    }
}));
exports.default = router;
