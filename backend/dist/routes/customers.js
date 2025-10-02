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
const Customer_1 = __importDefault(require("../models/Customer"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customers = yield Customer_1.default.find();
        res.json(customers);
    }
    catch (error) {
        console.error('Failed to fetch customers:', error.message);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
}));
router.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { query } = req.query;
    try {
        const customers = yield Customer_1.default.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } },
            ],
        });
        res.json(customers);
    }
    catch (error) {
        console.error('Failed to search customers:', error.message);
        res.status(500).json({ error: 'Failed to search customers' });
    }
}));
router.post('/', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, phone, address, pendingPayments } = req.body;
    try {
        if (!name || !email || !phone || !address) {
            return res.status(400).json({ error: 'All required fields must be provided' });
        }
        const customer = new Customer_1.default({
            name,
            email,
            phone,
            address,
            pendingPayments: pendingPayments || 0,
        });
        yield customer.save();
        res.status(201).json(customer);
    }
    catch (error) {
        console.error('Failed to create customer:', error.message);
        res.status(500).json({ error: 'Failed to create customer' });
    }
}));
router.put('/:id', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, phone, address, pendingPayments } = req.body;
    try {
        if (!name || !email || !phone || !address) {
            return res.status(400).json({ error: 'All required fields must be provided' });
        }
        const customer = yield Customer_1.default.findByIdAndUpdate(req.params.id, { name, email, phone, address, pendingPayments: pendingPayments || 0 }, { new: true });
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    }
    catch (error) {
        console.error('Failed to update customer:', error.message);
        res.status(500).json({ error: 'Failed to update customer' });
    }
}));
router.delete('/:id', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customer = yield Customer_1.default.findByIdAndDelete(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.status(204).json({});
    }
    catch (error) {
        console.error('Failed to delete customer:', error.message);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
}));
exports.default = router;
