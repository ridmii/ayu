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
    // Send initial email (make extra data optional)
    if (customer.email) {
      await sendInvoiceEmail(customer.email, 'New Order Confirmation', '<p>Your order is ready for packing.</p>');
    }
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

// Generic update for orders (so frontend PUT /api/orders/:id works)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // allow updating createdAt and shippingAddress and other mutable fields
    const { createdAt, shippingAddress, status, packerId } = req.body;
  if (createdAt) (order as any).createdAt = new Date(createdAt);
  if (shippingAddress) (order as any).shippingAddress = shippingAddress;
  if (status) (order as any).status = status;
  if (packerId) (order as any).packerId = packerId;

    await order.save();
    const populatedOrder = await Order.findById(order._id).populate('customer');
    io.emit('orderUpdated', populatedOrder);
    res.json(populatedOrder);
  } catch (error: any) {
    console.error('Failed to update order:', error.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

router.put('/:id/assign-packer', requireAdmin, async (req, res) => {
  const { packerId } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // store packerId or name depending on your model; keep string for compatibility
    order.packer = packerId || '';
    // also set packerId field
    order.packerId = packerId || undefined;
    await order.save();

    // Update packer status
    try {
      const Packer = require('../models/Packer').default;
      const p = await Packer.findById(packerId);
      if (p) {
        p.isActive = true;
        p.lastActive = new Date();
        await p.save();
        // emit packer update
        try { const ioRef = (req.app as any).get('io'); ioRef?.emit && ioRef.emit('packers:updated', p); } catch (e) { console.warn('emit failed', e); }
      }
    } catch (e) { console.warn('Failed to update packer status', e); }

    const token = jwt.sign({ packerId: packerId || '', orderId: order._id }, JWT_SECRET, { expiresIn: '24h' });
    const packingUrl = `${req.get('origin')}/packing?token=${token}`;

    io.emit('orderUpdated', order);
    // Return the fields the frontend expects
    res.json({ success: true, message: 'Packer assigned', packingToken: token, qrBase64: null, url: packingUrl });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to assign packer' });
  }
});

router.get('/packing/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, JWT_SECRET) as { packerName: string; orderId?: string };
  const { packerId, orderId } = decoded as any;
  let query: any = { packer: packerId, status: 'Pending' };
  if (orderId) query = { _id: orderId, packer: packerId };

  const orders = await Order.find(query).populate('customer');
  res.json({ orders, packerId });
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

router.put('/packing/:token/:orderId/packed', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, JWT_SECRET) as any;
    const order = await Order.findOne({ _id: req.params.orderId, packer: decoded.packerId });
    if (!order) return res.status(404).json({ error: 'Order not found or unauthorized' });
    order.status = 'Packed';
    await order.save();
    const populatedOrder = await Order.findById(order._id).populate('customer');
    if (populatedOrder && (populatedOrder as any).customer && (populatedOrder as any).customer.email) {
      await sendInvoiceEmail((populatedOrder as any).customer.email, `Packed Order Invoice #${order._id}`, '<p>Your order has been packed.</p>');
    }
    io.emit('orderUpdated', populatedOrder);
    res.json({ message: 'Order marked as packed' });
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Delete an order by id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // If there's a linked packing assignment, remove it
    try {
      const PackingAssignment = require('../models/PackingAssignment').default;
      await PackingAssignment.deleteMany({ orderId: order._id });
    } catch (e: any) {
      // ignore if model not available
      console.warn('PackingAssignment model not found when deleting order:', e?.message || e);
    }

    await order.deleteOne();
    const populatedOrder = await Order.findById(req.params.id); // should be null
    io.emit('orderDeleted', { id: req.params.id });
    res.json({ success: true, message: 'Order deleted' });
  } catch (error: any) {
    console.error('Failed to delete order:', error.message);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

export default router;