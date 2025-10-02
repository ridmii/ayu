import { Router } from 'express';
import Order from '../models/Order';
import Customer from '../models/Customer';
import { requireAdmin } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { io } from '../index';
import { sendInvoiceEmail } from '../utils/email';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().populate('customer');
    res.json(orders);
  } catch (error: any) {
    console.error('Failed to fetch orders:', error.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { customerId, items, personalized, paymentMethod } = req.body;
  try {
    const customer = await Customer.findById(customerId);
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

    const order = new Order({
      customer: customerId,
      items,
      totalAmount,
      pendingPayments: customer.pendingPayments,
      barcode: uuidv4(),
      status: 'Pending',
      personalized,
      paymentMethod,
    });

    await order.save();
    const populatedOrder = await Order.findById(order._id).populate('customer');
    io.emit('orderCreated', populatedOrder);
    // Send initial email
    await sendInvoiceEmail(customer.email, 'New Order Confirmation', '<p>Your order is ready for packing.</p>', populatedOrder);
    res.status(201).json(populatedOrder);
  } catch (error: any) {
    console.error('Failed to create order:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.put('/:id/status', async (req, res) => {
  const { status, packer } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    order.status = status;
    if (packer) order.packer = packer;
    await order.save();
    const populatedOrder = await Order.findById(order._id).populate('customer');
    io.emit('orderUpdated', populatedOrder);
    res.json(populatedOrder);
  } catch (error: any) {
    console.error('Failed to update order:', error.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

router.post('/:id/assign-packer', requireAdmin, async (req, res) => {
  const { packerName } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.packer = packerName;
    await order.save();

    const token = jwt.sign({ packerName, orderId: order._id }, JWT_SECRET, { expiresIn: '24h' });
    const packingUrl = `${req.get('origin')}/packing?token=${token}`;

    io.emit('orderUpdated', order);
    res.json({ message: 'Packer assigned', url: packingUrl, token });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to assign packer' });
  }
});

router.get('/packing/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, JWT_SECRET) as { packerName: string; orderId?: string };
    const { packerName, orderId } = decoded;
    let query = { packer: packerName, status: 'Pending' };
    if (orderId) query = { _id: orderId, packer: packerName };

    const orders = await Order.find(query).populate('customer');
    res.json({ orders, packerName });
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

router.put('/packing/:token/:orderId/packed', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, JWT_SECRET) as { packerName: string };
    const order = await Order.findOne({ _id: req.params.orderId, packer: decoded.packerName });
    if (!order) return res.status(404).json({ error: 'Order not found or unauthorized' });
    order.status = 'Packed';
    await order.save();
    const populatedOrder = await Order.findById(order._id).populate('customer');
    await sendInvoiceEmail(populatedOrder.customer.email, `Packed Order Invoice #${order._id}`, '<p>Your order has been packed.</p>', populatedOrder);
    io.emit('orderUpdated', populatedOrder);
    res.json({ message: 'Order marked as packed' });
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;