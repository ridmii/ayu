import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import QRCode from 'qrcode';
import PackingAssignment from '../models/PackingAssignment';
import Order from '../models/Order';
import Packer from '../models/Packer';
import { io } from '../index';

const router = Router();

// Get packing assignments by token
router.get('/:token', async (req, res) => {
  try {
    const assignments = await PackingAssignment.find({ 
      token: req.params.token, 
      status: 'assigned',
      expiry: { $gt: new Date() }
    })
    .populate('orderId')
    .populate('packerId');

    if (!assignments.length) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }

    res.json({ assignments });
  } catch (error) {
    console.error('Error fetching packing assignments:', error);
    res.status(500).json({ error: 'Failed to fetch packing assignments' });
  }
});

// Mark order as packed
router.put('/:token/:orderId/packed', async (req, res) => {
  try {
    const assignment = await PackingAssignment.findOne({ 
      token: req.params.token, 
      orderId: req.params.orderId,
      status: 'assigned',
      expiry: { $gt: new Date() }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Invalid assignment or token expired' });
    }

    // Update assignment status
    assignment.status = 'packed';
    assignment.updatedAt = new Date();
    await assignment.save();

    // Update order status
    const order = await Order.findById(assignment.orderId);
    if (order) {
      order.status = 'Packed';
      await order.save();
      
      // Emit socket event for real-time updates
      io.emit('orderUpdated', order);
      io.emit('packingAssignmentUpdated', assignment);
    }

    res.json({ 
      success: true, 
      message: 'Order marked as packed successfully',
      orderId: order?._id 
    });
  } catch (error) {
    console.error('Error marking order as packed:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Assign packer to order
router.put('/:orderId/assign', async (req, res) => {
  const { packerId } = req.body;
  
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const packer = await Packer.findById(packerId);
    if (!packer) {
      return res.status(404).json({ error: 'Packer not found' });
    }

    // Generate unique token and QR code
    const token = uuid();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/packing?token=${token}`;
    const qrBase64 = await QRCode.toDataURL(link);

    // Create packing assignment
    const assignment = new PackingAssignment({
      orderId: order._id,
      packerId,
      token,
      qrCode: qrBase64,
      expiry,
      status: 'assigned'
    });
    await assignment.save();

    // Update order status and packer assignment
    order.status = 'Packing';
    order.packerId = packerId;
    order.packingAssignment = assignment._id;
    await order.save();

    // Emit socket events
    io.emit('orderUpdated', order);
    io.emit('packingAssignmentCreated', assignment);

    res.json({ 
      success: true,
      packingToken: token, 
      qrBase64,
      assignmentId: assignment._id,
      message: 'Packer assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning packer:', error);
    res.status(500).json({ error: 'Failed to assign packer' });
  }
});

// Get packer statistics
router.get('/packer/:packerId/stats', async (req, res) => {
  try {
    const packerId = req.params.packerId;
    
    const totalAssignments = await PackingAssignment.countDocuments({ packerId });
    const completedAssignments = await PackingAssignment.countDocuments({ 
      packerId, 
      status: 'packed' 
    });
    const pendingAssignments = await PackingAssignment.countDocuments({ 
      packerId, 
      status: 'assigned' 
    });

    res.json({
      totalAssignments,
      completedAssignments,
      pendingAssignments,
      completionRate: totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0
    });
  } catch (error) {
    console.error('Error fetching packer stats:', error);
    res.status(500).json({ error: 'Failed to fetch packer statistics' });
  }
});

export default router;