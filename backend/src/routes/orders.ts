import { Router } from 'express';
import Order from '../models/Order';
import Customer from '../models/Customer';
import { requireAdmin } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../index';

const router = Router();

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

export default router;