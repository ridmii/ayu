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
exports.setupPackingRoutes = void 0;
const express_1 = __importDefault(require("express"));
const PackingAssignment_1 = __importDefault(require("../models/PackingAssignment"));
const Order_1 = __importDefault(require("../models/Order"));
const qrcode_1 = __importDefault(require("qrcode"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const setupPackingRoutes = (io) => {
    // Get order details for packing
    router.get('/:orderId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const assignment = yield PackingAssignment_1.default.findOne({ orderId: req.params.orderId }).populate({
                path: 'orderId',
                populate: { path: 'items.productId' },
            });
            if (!assignment)
                return res.status(404).json({ error: 'Assignment not found' });
            res.json(assignment.orderId);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch order' });
        }
    }));
    // Confirm packing
    router.post('/confirm', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { orderId } = req.body;
        try {
            const assignment = yield PackingAssignment_1.default.findOneAndUpdate({ orderId, status: 'assigned' }, { status: 'packed', updatedAt: new Date() }, { new: true });
            if (!assignment)
                return res.status(404).json({ error: 'Assignment not found' });
            yield Order_1.default.findByIdAndUpdate(orderId, { status: 'packed' });
            io.emit('packingConfirmed', { orderId, status: 'packed' });
            res.json({ message: 'Packing confirmed' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to confirm packing' });
        }
    }));
    // Create packing assignment
    router.post('/assign', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { orderId, employeeId } = req.body;
        try {
            const qrCode = yield qrcode_1.default.toDataURL(`http://localhost:5173/packing/${orderId}`);
            const assignment = new PackingAssignment_1.default({ orderId, employeeId, qrCode });
            yield assignment.save();
            res.status(201).json(assignment);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to assign packing' });
        }
    }));
    return router;
};
exports.setupPackingRoutes = setupPackingRoutes;
exports.default = router;
