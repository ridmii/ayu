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
// routes/packers.ts (new file)
const express_1 = require("express");
const Packer_1 = __importDefault(require("../models/Packer"));
const router = (0, express_1.Router)();
console.log('Packers route file loaded successfully');
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('GET /api/packers request received'); // Log when hit
    try {
        const packers = yield Packer_1.default.find();
        res.json(packers);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch packers' });
    }
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const packer = new Packer_1.default(req.body);
        yield packer.save();
        // Emit real-time update (get io from express app to avoid circular import)
        try {
            const io = req.app.get('io');
            (io === null || io === void 0 ? void 0 : io.emit) && io.emit('packers:created', packer);
        }
        catch (e) {
            console.warn('Socket emit failed', e);
        }
        res.json(packer);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create packer' });
    }
}));
// Update packer
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updated = yield Packer_1.default.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated)
            return res.status(404).json({ error: 'Packer not found' });
        // Emit real-time update (get io from express app to avoid circular import)
        try {
            const io = req.app.get('io');
            (io === null || io === void 0 ? void 0 : io.emit) && io.emit('packers:updated', updated);
        }
        catch (e) {
            console.warn('Socket emit failed', e);
        }
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update packer' });
    }
}));
// Delete packer
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deleted = yield Packer_1.default.findByIdAndDelete(id);
        if (!deleted)
            return res.status(404).json({ error: 'Packer not found' });
        // Emit real-time update (get io from express app to avoid circular import)
        try {
            const io = req.app.get('io');
            (io === null || io === void 0 ? void 0 : io.emit) && io.emit('packers:deleted', { _id: id });
        }
        catch (e) {
            console.warn('Socket emit failed', e);
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete packer' });
    }
}));
exports.default = router;
