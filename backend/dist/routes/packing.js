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
const uuid_1 = require("uuid");
const qrcode_1 = __importDefault(require("qrcode"));
const PackingAssignment_1 = __importDefault(require("../models/PackingAssignment"));
const Order_1 = __importDefault(require("../models/Order"));
const Packer_1 = __importDefault(require("../models/Packer"));
const index_1 = require("../index");
const router = (0, express_1.Router)();
// Get packing assignments by token
router.get('/:token', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assignments = yield PackingAssignment_1.default.find({
            token: req.params.token,
            status: 'assigned',
            expiry: { $gt: new Date() }
        })
            .populate('orderId')
            .populate('packerId');
        if (!assignments.length) {
            return res.status(404).json({ error: 'Invalid or expired token' });
        }
        res.json({ assignments });
    }
    catch (error) {
        console.error('Error fetching packing assignments:', error);
        res.status(500).json({ error: 'Failed to fetch packing assignments' });
    }
}));
// Public packer-only view (no prices, no order date) for PC-based packer system
router.get('/for-packer/:token', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assignments = yield PackingAssignment_1.default.find({
            token: req.params.token,
            status: 'assigned',
            expiry: { $gt: new Date() }
        })
            .populate('orderId')
            .populate('packerId');
        if (!assignments.length) {
            return res.status(404).json({ error: 'Invalid or expired token' });
        }
        // Sanitize orders for packer view: remove prices and order date
        const sanitized = assignments.map(a => {
            // a.orderId / a.packerId can be either ObjectId or populated documents.
            // Safely handle both cases without calling toObject on ObjectId.
            let order = null;
            if (a.orderId) {
                if (typeof a.orderId === 'object' && a.orderId.toObject) {
                    order = a.orderId.toObject();
                }
                else if (typeof a.orderId === 'object') {
                    order = a.orderId;
                }
            }
            if (order) {
                // keep only required fields for packing
                order.items = order.items.map((it) => ({
                    productName: it.productName,
                    quantity: it.quantity,
                    unit: it.unit || null,
                    productId: it.productId
                }));
                // remove fields packers shouldn't see
                delete order.totalPrice;
                delete order.orderDate;
                order.customer = order.customer ? {
                    name: order.customer.name || '',
                    address: order.customer.address || '',
                    phone: order.customer.phone || ''
                } : null;
            }
            let packer = null;
            if (a.packerId) {
                if (typeof a.packerId === 'object' && a.packerId.toObject) {
                    packer = a.packerId.toObject();
                }
                else if (typeof a.packerId === 'object') {
                    packer = a.packerId;
                }
            }
            if (packer) {
                // only expose packer display fields
                packer.name = packer.name || packer.fullName || '';
                delete packer.email;
                delete packer.phone;
            }
            return {
                _id: a._id,
                token: a.token,
                expiry: a.expiry,
                status: a.status,
                order,
                packer
            };
        });
        res.json({ assignments: sanitized });
    }
    catch (error) {
        console.error('Error fetching packer-only assignments:', error);
        res.status(500).json({ error: 'Failed to fetch packer assignments' });
    }
}));
// Support query token: /for-packer?token=...
router.get('/for-packer', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = String(req.query.token || '');
    if (!token)
        return res.status(400).json({ error: 'Token is required' });
    try {
        const assignments = yield PackingAssignment_1.default.find({
            token,
            status: 'assigned',
            expiry: { $gt: new Date() }
        })
            .populate('orderId')
            .populate('packerId');
        if (!assignments.length) {
            return res.status(404).json({ error: 'Invalid or expired token' });
        }
        const sanitized = assignments.map(a => {
            let order = null;
            if (a.orderId) {
                if (typeof a.orderId === 'object' && a.orderId.toObject) {
                    order = a.orderId.toObject();
                }
                else if (typeof a.orderId === 'object') {
                    order = a.orderId;
                }
            }
            if (order) {
                order.items = order.items.map((it) => ({
                    productName: it.productName,
                    quantity: it.quantity,
                    unit: it.unit || null,
                    productId: it.productId
                }));
                delete order.totalPrice;
                delete order.orderDate;
                order.customer = order.customer ? {
                    name: order.customer.name || '',
                    address: order.customer.address || '',
                    phone: order.customer.phone || ''
                } : null;
            }
            let packer = null;
            if (a.packerId) {
                if (typeof a.packerId === 'object' && a.packerId.toObject) {
                    packer = a.packerId.toObject();
                }
                else if (typeof a.packerId === 'object') {
                    packer = a.packerId;
                }
            }
            if (packer) {
                packer.name = packer.name || packer.fullName || '';
                delete packer.email;
                delete packer.phone;
            }
            return {
                _id: a._id,
                token: a.token,
                expiry: a.expiry,
                status: a.status,
                order,
                packer
            };
        });
        res.json({ assignments: sanitized });
    }
    catch (error) {
        console.error('Error fetching packer-only assignments (query):', error);
        res.status(500).json({ error: 'Failed to fetch packer assignments' });
    }
}));
// Mark order as packed
router.put('/:token/:orderId/packed', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assignment = yield PackingAssignment_1.default.findOne({
            token: req.params.token,
            orderId: req.params.orderId,
            status: 'assigned',
            expiry: { $gt: new Date() }
        });
        if (!assignment) {
            return res.status(404).json({ error: 'Invalid assignment or token expired' });
        }
        // Update assignment status
        assignment.status = 'packed';
        assignment.updatedAt = new Date();
        yield assignment.save();
        // Update order status
        const order = yield Order_1.default.findById(assignment.orderId);
        if (order) {
            order.status = 'Packed';
            yield order.save();
            // Emit socket event for real-time updates
            index_1.io.emit('orderUpdated', order);
            index_1.io.emit('packingAssignmentUpdated', assignment);
        }
        res.json({
            success: true,
            message: 'Order marked as packed successfully',
            orderId: order === null || order === void 0 ? void 0 : order._id
        });
    }
    catch (error) {
        console.error('Error marking order as packed:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
}));
// Assign packer to order
router.put('/:orderId/assign', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { packerId } = req.body;
    try {
        const order = yield Order_1.default.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const packer = yield Packer_1.default.findById(packerId);
        if (!packer) {
            return res.status(404).json({ error: 'Packer not found' });
        }
        // Generate unique token
        const token = (0, uuid_1.v4)();
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        // Existing frontend packing link (used by mobile QR flows)
        const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/packing?token=${token}`;
        let qrBase64 = null;
        try {
            qrBase64 = yield qrcode_1.default.toDataURL(link);
        }
        catch (err) {
            console.warn('Failed to generate QR code:', err);
            qrBase64 = null;
        }
        // New packer system link (PC-based interface) - configure via PACKER_SYSTEM_URL
        const packerLink = `${process.env.PACKER_SYSTEM_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/for-packer?token=${token}`;
        // Create packing assignment
        const assignment = new PackingAssignment_1.default({
            orderId: order._id,
            packerId,
            token,
            qrCode: qrBase64,
            expiry,
            status: 'assigned'
        });
        yield assignment.save();
        // Update order status and packer assignment
        order.status = 'Packing';
        order.packerId = packerId;
        order.packingAssignment = assignment._id;
        yield order.save();
        // Emit socket events
        index_1.io.emit('orderUpdated', order);
        index_1.io.emit('packingAssignmentCreated', assignment);
        res.json({
            success: true,
            packingToken: token,
            qrBase64,
            packerLink,
            assignmentId: assignment._id,
            message: 'Packer assigned successfully'
        });
    }
    catch (error) {
        console.error('Error assigning packer:', error);
        res.status(500).json({ error: 'Failed to assign packer' });
    }
}));
// Get packer statistics
router.get('/packer/:packerId/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const packerId = req.params.packerId;
        const totalAssignments = yield PackingAssignment_1.default.countDocuments({ packerId });
        const completedAssignments = yield PackingAssignment_1.default.countDocuments({
            packerId,
            status: 'packed'
        });
        const pendingAssignments = yield PackingAssignment_1.default.countDocuments({
            packerId,
            status: 'assigned'
        });
        res.json({
            totalAssignments,
            completedAssignments,
            pendingAssignments,
            completionRate: totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0
        });
    }
    catch (error) {
        console.error('Error fetching packer stats:', error);
        res.status(500).json({ error: 'Failed to fetch packer statistics' });
    }
}));
exports.default = router;
