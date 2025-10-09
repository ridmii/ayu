import express from 'express';
import PDFDocument from 'pdfkit';
import Order from '../models/Order';
import Invoice from '../models/Invoice';
import Customer from '../models/Customer';
import { requireAdmin } from '../middleware/auth';
import { sendWhatsApp } from '../utils/twilio';

const router = express.Router();

// Generate invoice
router.post('/generate', requireAdmin, async (req, res) => {
  const { orderId, paymentMethod } = req.body;
  try {
    const order = await Order.findById(orderId).populate('customer');
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const customer = order.customer as any;
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const totalAmount = order.totalAmount + (customer.pendingPayments || 0);
    const invoice = new Invoice({
      orderId,
      customerId: order.customer,
      totalAmount,
      pendingAmount: totalAmount,
      paymentMethod,
      isPersonalized: !!order.personalized,
    });
    await invoice.save();

    // Generate PDF
    const doc = new PDFDocument();
    let buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfData = Buffer.concat(buffers);
      const base64 = `data:application/pdf;base64,${pdfData.toString('base64')}`;
      // Comment out for demo (no WhatsApp notifications)
      // await sendWhatsApp(`Invoice for Order ${orderId}`, base64, customer.phone);
      res.json(invoice);
    });
    doc.text(`Invoice for ${customer.name}`);
    doc.text(`Order ID: ${orderId}`);
    doc.text(`Total: ${totalAmount} LKR`);
    doc.text(`Payment Method: ${paymentMethod}`);
    doc.end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// Get invoices (exclude personalized for non-admins)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const invoices = await Invoice.find({ isPersonalized: false }).populate('orderId customerId');
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get all invoices for admin (including personalized)
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const invoices = await Invoice.find().populate('orderId customerId');
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

export default router;