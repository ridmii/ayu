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
const pdfkit_1 = __importDefault(require("pdfkit"));
const Order_1 = __importDefault(require("../models/Order"));
const Invoice_1 = __importDefault(require("../models/Invoice"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Generate invoice
router.post('/generate', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId, paymentMethod } = req.body;
    try {
        const order = yield Order_1.default.findById(orderId).populate('customer');
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        const customer = order.customer;
        if (!customer)
            return res.status(404).json({ error: 'Customer not found' });
        const totalAmount = order.totalAmount + (customer.pendingPayments || 0);
        const invoice = new Invoice_1.default({
            orderId,
            customerId: order.customer,
            totalAmount,
            pendingAmount: totalAmount,
            paymentMethod,
            isPersonalized: !!order.personalized,
        });
        yield invoice.save();
        // Generate PDF
        const doc = new pdfkit_1.default();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => __awaiter(void 0, void 0, void 0, function* () {
            const pdfData = Buffer.concat(buffers);
            const base64 = `data:application/pdf;base64,${pdfData.toString('base64')}`;
            // Comment out for demo (no WhatsApp notifications)
            // await sendWhatsApp(`Invoice for Order ${orderId}`, base64, customer.phone);
            res.json(invoice);
        }));
        doc.text(`Invoice for ${customer.name}`);
        doc.text(`Order ID: ${orderId}`);
        doc.text(`Total: ${totalAmount} LKR`);
        doc.text(`Payment Method: ${paymentMethod}`);
        doc.end();
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate invoice' });
    }
}));
// Get invoices (exclude personalized for non-admins)
router.get('/', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const invoices = yield Invoice_1.default.find({ isPersonalized: false }).populate('orderId customerId');
        res.json(invoices);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
}));
// Get all invoices for admin (including personalized)
router.get('/admin', auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const invoices = yield Invoice_1.default.find().populate('orderId customerId');
        res.json(invoices);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
}));
exports.default = router;
