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
const index_1 = require("../index");
const router = (0, express_1.Router)();
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
exports.default = router;
