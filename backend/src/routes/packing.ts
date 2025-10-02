// routes/packing.ts (updated)
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import QRCode from 'qrcode';
import PackingAssignment from '../models/PackingAssignment';
import Order from '../models/Order';
import { io } from '../index';

const router = Router();

router.get('/:token', async (req, res) => {
  try {
    const assignments = await PackingAssignment.find({ 
      token: req.params.token, 
      status: 'assigned',
      expiry: { $gt: new Date() }
    }).populate({
      path: 'orderId',
      populate: { path: 'customer' }
    }).populate('packerId');

    if (!assignments.length) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }

    const orders = assignments.map(a => a.orderId);
    const packerName = assignments[0].packerId.name;

    res.json({ orders, packerName });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch packing orders' });
  }
});

router.put('/:token/:orderId/packed', async (req, res) => {
  try {
    const assignment = await PackingAssignment.findOne({ 
      token: req.params.token, 
      orderId: req.params.orderId,
      status: 'assigned',
      expiry: { $gt: new Date() }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Invalid assignment' });
    }

    assignment.status = 'packed';
    await assignment.save();

    const order = await Order.findById(assignment.orderId);
    if (order) {
      order.status = 'Packed'; // Assuming you have a status field in Order
      await order.save();
      io.emit('orderUpdated', order);
    }

    res.json({ message: 'Order marked as packed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.put('/:orderId/assign', async (req, res) => {
  const { packerId } = req.body;
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const token = uuid();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/packing?token=${token}`;
    const qrBase64 = await QRCode.toDataURL(link);

    const assignment = new PackingAssignment({
      orderId: order._id,
      packerId,
      token,
      qrCode: qrBase64,
      expiry,
    });
    await assignment.save();

    // Optionally link back to order
    order.packingAssignment = assignment._id;
    await order.save();

    io.emit('orderUpdated', order);

    res.json({ packingToken: token, qrBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign packer' });
  }
});

export default router;