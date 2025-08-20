import express from 'express';
import { Server } from 'socket.io';
import PackingAssignment from '../models/PackingAssignment';
import Order from '../models/Order';
import QRCode from 'qrcode';
import { requireAdmin } from '../middleware/auth';

const router = express.Router();

export const setupPackingRoutes = (io: Server) => {
  // Get order details for packing
  router.get('/:orderId', async (req, res) => {
    try {
      const assignment = await PackingAssignment.findOne({ orderId: req.params.orderId }).populate({
        path: 'orderId',
        populate: { path: 'items.productId' },
      });
      if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
      res.json(assignment.orderId);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  });

  // Confirm packing
  router.post('/confirm', async (req, res) => {
    const { orderId } = req.body;
    try {
      const assignment = await PackingAssignment.findOneAndUpdate(
        { orderId, status: 'assigned' },
        { status: 'packed', updatedAt: new Date() },
        { new: true }
      );
      if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
      await Order.findByIdAndUpdate(orderId, { status: 'packed' });
      io.emit('packingConfirmed', { orderId, status: 'packed' });
      res.json({ message: 'Packing confirmed' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to confirm packing' });
    }
  });

  // Create packing assignment
  router.post('/assign', requireAdmin, async (req, res) => {
    const { orderId, employeeId } = req.body;
    try {
      const qrCode = await QRCode.toDataURL(`http://localhost:5173/packing/${orderId}`);
      const assignment = new PackingAssignment({ orderId, employeeId, qrCode });
      await assignment.save();
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to assign packing' });
    }
  });

  return router;
};

export default router;