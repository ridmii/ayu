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
const Order_1 = __importDefault(require("../models/Order"));
const Product_1 = __importDefault(require("../models/Product"));
const RawMaterial_1 = __importDefault(require("../models/RawMaterial"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Create order
router.post('/', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { customerId, items, personalizedItems } = req.body;
    try {
        let totalAmount = 0;
        // Calculate total for standard items
        for (const item of items) {
            const product = yield Product_1.default.findById(item.productId);
            if (!product)
                return res.status(404).json({ error: `Product ${item.productId} not found` });
            totalAmount += product.price * item.quantity;
            // Update product quantity
            product.quantity -= item.quantity;
            yield product.save();
        }
        // Calculate total for personalized items and update raw materials
        for (const item of personalizedItems) {
            totalAmount += item.price * item.quantity;
            for (const raw of item.rawMaterials) {
                const material = yield RawMaterial_1.default.findById(raw.materialId);
                if (!material)
                    return res.status(404).json({ error: `Raw material ${raw.materialId} not found` });
                material.processedQuantity -= raw.quantityUsed;
                yield material.save();
            }
        }
        const order = new Order_1.default({ customerId, items, personalizedItems, totalAmount });
        yield order.save();
        res.status(201).json(order);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create order' });
    }
}));
// Get all orders
router.get('/', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield Order_1.default.find().populate('customerId items.productId');
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
}));
exports.default = router;
