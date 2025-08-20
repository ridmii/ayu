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
const RawMaterial_1 = __importDefault(require("../models/RawMaterial"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Add raw material
router.post('/', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, initialQuantity, unit, lowStockThreshold } = req.body;
    try {
        const material = new RawMaterial_1.default({ name, initialQuantity, processedQuantity: initialQuantity, unit, lowStockThreshold });
        yield material.save();
        res.status(201).json(material);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to add raw material' });
    }
}));
// Process raw material (wash/dry)
router.post('/process', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { materialId, processedQuantity } = req.body;
    try {
        const material = yield RawMaterial_1.default.findById(materialId);
        if (!material)
            return res.status(404).json({ error: 'Material not found' });
        material.processedQuantity = processedQuantity;
        material.wastage = material.initialQuantity - processedQuantity;
        material.updatedAt = new Date();
        yield material.save();
        // Comment out for demo (no WhatsApp notifications)
        // if (material.processedQuantity < material.lowStockThreshold) {
        //   await sendWhatsApp(
        //     `Low stock alert: ${material.name} is below threshold (${material.processedQuantity} ${material.unit} remaining)`
        //   );
        // }
        res.json(material);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to process material' });
    }
}));
// Get all raw materials
router.get('/', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const materials = yield RawMaterial_1.default.find();
        res.json(materials);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch raw materials' });
    }
}));
exports.default = router;
