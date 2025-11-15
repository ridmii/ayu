import { Router } from 'express';
import Order from '../models/Order';
import Customer from '../models/Customer';
import Product from '../models/Product'; // Import Product model
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
  console.log('POST /api/orders body:', JSON.stringify({ customerId, items, personalized, paymentMethod }));
  try {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      console.error('Customer not found:', customerId);
      return res.status(404).json({ error: 'Customer not found' });
    }

    let totalAmount = 0;
    
    // Validate items and check stock availability
    for (const item of items) {
      console.log(`Validating item:`, JSON.stringify(item));
      if (!(item as any).productId || !item.quantity || !item.unitPrice) {
        console.error('Item validation failed:', item);
        return res.status(400).json({ error: 'All item fields are required' });
      }

      // Check if product exists and has sufficient stock (in variants)
      const product = await Product.findById((item as any).productId);
      if (!product) {
        console.error('Product not found:', (item as any).productId);
        return res.status(404).json({ error: `Product not found: ${item.productName || item.productId}` });
      }

      // Find the matching variant by size/unit and check its stock
      const variantSize = (item as any).unit || '';
      console.log(`Looking for variant with size: "${variantSize}" in product ${(item as any).productId}`);
      console.log(`Product has ${product.variants?.length || 0} variants:`, product.variants?.map((v: any) => ({ size: v.size, stock: v.stock })));
      
      // Try to find variant by size, but if size is empty or not found, use first variant
      let variant = null;
      if (variantSize && product.variants) {
        variant = product.variants.find((v: any) => v.size === variantSize);
      }
      if (!variant && product.variants && product.variants.length > 0) {
        console.log(`Variant "${variantSize}" not found, using first variant`);
        variant = product.variants[0];
      }

      if (!variant) {
        console.error(`No variants available for product ${(item as any).productId}`);
        return res.status(400).json({ 
          error: `No variants available for ${item.productName}` 
        });
      }

      const currentStock = variant.stock || 0;
      console.log(`Variant stock: ${currentStock}, requested: ${item.quantity}`);
      if (currentStock < item.quantity) {
        // Log detailed error info
        console.error(`Insufficient stock for ${item.productName}: available ${currentStock}, requested ${item.quantity}`);
        // Allow order creation anyway if stock is 0 (demo mode - can be toggled with an env var later)
        const allowZeroStock = process.env.ALLOW_ZERO_STOCK === 'true';
        if (!allowZeroStock) {
          return res.status(400).json({ 
            error: `Insufficient stock for ${item.productName}. Available: ${currentStock}, Requested: ${item.quantity}` 
          });
        } else {
          console.warn(`Allowing order despite insufficient stock (ALLOW_ZERO_STOCK=true)`);
        }
      }

      totalAmount += item.quantity * item.unitPrice;
    }

    // Reduce product quantities from the correct variants
    for (const item of items) {
      const pid = (item as any).productId || (item as any).product?._id;
      if (pid) {
        const variantSize = (item as any).unit || '';
        const product = await Product.findById(pid);
        if (product && product.variants) {
          // Find and update the matching variant
          const variantIndex = variantSize
            ? product.variants.findIndex((v: any) => v.size === variantSize)
            : 0;
          
          if (variantIndex >= 0) {
            product.variants[variantIndex].stock = Math.max(0, (product.variants[variantIndex].stock || 0) - ((item as any).quantity || 0));
            await product.save();
          }
        }
      }
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
    
    // Emit product update for real-time stock changes
    for (const item of items) {
      const pid = (item as any).productId || (item as any).product?._id;
      if (pid) {
        const updatedProduct = await Product.findById(pid);
        if (updatedProduct) {
          io.emit('productUpdated', updatedProduct);
        }
      }
    }

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

// routes/orders.ts - Fix the update endpoint
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Allow updating createdAt and shippingAddress and other mutable fields
    const { createdAt, shippingAddress, status, packerId } = req.body;
    
    if (createdAt) {
      order.createdAt = new Date(createdAt);
    }
    
    if (shippingAddress) {
      // Ensure shippingAddress exists on order object
      if (!order.shippingAddress) {
        order.shippingAddress = {};
      }
      Object.assign(order.shippingAddress, shippingAddress);
    }
    
    if (status) {
      order.status = status;
    }
    
    if (packerId) {
      order.packerId = packerId;
    }

    await order.save();
    const populatedOrder = await Order.findById(order._id).populate('customer');
    
    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('orderUpdated', populatedOrder);
    }
    
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

// Delete an order by id (admin) - with stock restoration
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Restore product quantities when order is deleted
    for (const item of order.items) {
      if ((item as any).productId) {
        await Product.findByIdAndUpdate(
          (item as any).productId,
          { $inc: { quantity: (item as any).quantity } },
          { new: true }
        );
        
        // Emit product update for real-time stock changes
        const updatedProduct = await Product.findById((item as any).productId);
        if (updatedProduct) {
          io.emit('productUpdated', updatedProduct);
        }
      }
    }

    // If there's a linked packing assignment, remove it
    try {
      const PackingAssignment = require('../models/PackingAssignment').default;
      await PackingAssignment.deleteMany({ orderId: order._id });
    } catch (e: any) {
      // ignore if model not available
      console.warn('PackingAssignment model not available when deleting order:', e?.message || e);
    }

    await order.deleteOne();
    io.emit('orderDeleted', { id: req.params.id });
    res.json({ success: true, message: 'Order deleted and stock restored' });
  } catch (error: any) {
    console.error('Failed to delete order:', error.message);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// New endpoint to update order items and adjust stock
router.put('/:id/items', requireAdmin, async (req, res) => {
  try {
    const { items } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Restore original quantities first
    for (const oldItem of order.items) {
      if ((oldItem as any).productId) {
        await Product.findByIdAndUpdate(
          (oldItem as any).productId,
          { $inc: { quantity: (oldItem as any).quantity } },
          { new: true }
        );
      }
    }

    // Validate new items and check stock
    for (const item of items) {
      if (!(item as any).productId || !item.quantity || !item.unitPrice) {
        return res.status(400).json({ error: 'All item fields are required' });
      }

      const product = await Product.findById((item as any).productId);
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.productName || item.productId}` });
      }

      const currentStock = (product as any).quantity || 0;
      if (currentStock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${(product as any).name}${(product as any).unit ? ` (${(product as any).unit})` : ''}. Available: ${currentStock}, Requested: ${item.quantity}` 
        });
      }
    }

    // Update quantities with new items
    for (const item of items) {
      await Product.findByIdAndUpdate(
  (item as any).productId,
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );
    }

    // Update order items and recalculate total
    order.items = items;
    order.totalAmount = items.reduce((total: number, item: any) => total + (item.quantity * item.unitPrice), 0);
    
    await order.save();
    const populatedOrder = await Order.findById(order._id).populate('customer');

    // Emit updates
    io.emit('orderUpdated', populatedOrder);
    for (const item of items) {
  const updatedProduct = await Product.findById((item as any).productId);
      if (updatedProduct) {
        io.emit('productUpdated', updatedProduct);
      }
    }

    res.json(populatedOrder);
  } catch (error: any) {
    console.error('Failed to update order items:', error.message);
    res.status(500).json({ error: 'Failed to update order items' });
  }
});

export default router;