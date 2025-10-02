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
const mongoose_1 = __importDefault(require("mongoose"));
const RawMaterial_1 = __importDefault(require("../models/RawMaterial"));
const router = (0, express_1.Router)();
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            return res.status(500).json({ error: 'MongoDB not connected' });
        }
        const rawMaterials = yield RawMaterial_1.default.find();
        res.json(rawMaterials);
    }
    catch (error) {
        console.error('Failed to fetch raw materials:', {
            message: error.message,
            stack: error.stack,
        });
        res.status(500).json({ error: 'Failed to fetch raw materials' });
    }
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, initialQuantity, unit, lowStockThreshold } = req.body;
    try {
        if (!name || !initialQuantity || !unit || !lowStockThreshold) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (mongoose_1.default.connection.readyState !== 1) {
            return res.status(500).json({ error: 'MongoDB not connected' });
        }
        const rawMaterial = new RawMaterial_1.default({
            name,
            initialQuantity,
            processedQuantity: initialQuantity,
            wastage: 0,
            usableQuantity: initialQuantity,
            unit,
            lowStockThreshold,
        });
        yield rawMaterial.save();
        res.status(201).json(rawMaterial);
    }
    catch (error) {
        console.error('Failed to add raw material:', {
            message: error.message,
            stack: error.stack,
        });
        res.status(500).json({ error: 'Failed to add raw material' });
    }
}));
router.post('/process', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { materialId, processedQuantity } = req.body;
    try {
        if (!materialId || processedQuantity == null) {
            return res.status(400).json({ error: 'Material ID and processed quantity are required' });
        }
        if (mongoose_1.default.connection.readyState !== 1) {
            return res.status(500).json({ error: 'MongoDB not connected' });
        }
        const rawMaterial = yield RawMaterial_1.default.findById(materialId);
        if (!rawMaterial) {
            return res.status(404).json({ error: 'Raw material not found' });
        }
        if (processedQuantity > rawMaterial.initialQuantity) {
            return res.status(400).json({ error: 'Processed quantity exceeds initial quantity' });
        }
        rawMaterial.processedQuantity = processedQuantity;
        rawMaterial.wastage = rawMaterial.initialQuantity - processedQuantity;
        rawMaterial.usableQuantity = processedQuantity;
        yield rawMaterial.save();
        res.json(rawMaterial);
    }
    catch (error) {
        console.error('Failed to process raw material:', {
            message: error.message,
            stack: error.stack,
            materialId,
            processedQuantity,
        });
        res.status(500).json({ error: 'Failed to process raw material' });
    }
}));
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            return res.status(500).json({ error: 'MongoDB not connected' });
        }
        const rawMaterial = yield RawMaterial_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!rawMaterial) {
            return res.status(404).json({ error: 'Raw material not found' });
        }
        res.json(rawMaterial);
    }
    catch (error) {
        console.error('Failed to update raw material:', {
            message: error.message,
            stack: error.stack,
        });
        res.status(500).json({ error: 'Failed to update raw material' });
    }
}));
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (mongoose_1.default.connection.readyState !== 1) {
            return res.status(500).json({ error: 'MongoDB not connected' });
        }
        const rawMaterial = yield RawMaterial_1.default.findByIdAndDelete(req.params.id);
        if (!rawMaterial) {
            return res.status(404).json({ error: 'Raw material not found' });
        }
        res.json({ message: 'Raw material deleted' });
    }
    catch (error) {
        console.error('Failed to delete raw material:', {
            message: error.message,
            stack: error.stack,
        });
        res.status(500).json({ error: 'Failed to delete raw material' });
    }
}));
exports.default = router;
