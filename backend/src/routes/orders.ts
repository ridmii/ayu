import { Router } from 'express';
import Order from '../models/Order';
import Customer from '../models/Customer';
import Product from '../models/Product';
import { requireAdmin } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { io } from '../index';
import { sendInvoiceEmail } from '../utils/email';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GET /api/orders - Fixed to include pendingPaid
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().populate('customer').lean();
    
    // Ensure pendingPaid field is always present
    const ordersWithPendingPaid = orders.map(order => ({
      ...order,
      pendingPaid: order.pendingPaid || false
    }));
    
    res.json(ordersWithPendingPaid);
  } catch (error: any) {
    console.error('Failed to fetch orders:', error.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /api/orders - Fixed to properly handle pendingPaid
router.post('/', requireAdmin, async (req, res) => {
  const { customerId, items, personalized, paymentMethod, pendingPaid } = req.body;
  
  console.log('🔍 BACKEND ORDER CREATION - Received:', {
    customerId,
    itemsCount: items?.length,
    personalized,
    paymentMethod,
    pendingPaid,
    pendingPaidType: typeof pendingPaid
  });
  
  try {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      console.error('Customer not found:', customerId);
      return res.status(404).json({ error: 'Customer not found' });
    }

    let itemsTotal = 0;
    
    // Validate items and check stock availability
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.unitPrice) {
        return res.status(400).json({ error: 'All item fields are required' });
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.productName || item.productId}` });
      }

      const variantSize = item.unit || '';
      let variant = null;
      
      if (variantSize && product.variants) {
        variant = product.variants.find((v: any) => v.size === variantSize);
      }
      if (!variant && product.variants && product.variants.length > 0) {
        variant = product.variants[0];
      }

      if (!variant) {
        return res.status(400).json({ 
          error: `No variants available for ${item.productName}` 
        });
      }

      const currentStock = variant.stock || 0;
      if (currentStock < item.quantity) {
        const allowZeroStock = process.env.ALLOW_ZERO_STOCK === 'true';
        if (!allowZeroStock) {
          return res.status(400).json({ 
            error: `Insufficient stock for ${item.productName}. Available: ${currentStock}, Requested: ${item.quantity}` 
          });
        }
      }

      itemsTotal += item.quantity * item.unitPrice;
    }

    // FIXED: Proper pending payment calculation
    const customerPendingAmount = customer.pendingPayments || 0;
    const orderTotalAmount = pendingPaid ? itemsTotal + customerPendingAmount : itemsTotal;

    console.log('💰 BACKEND ORDER CALCULATION:', {
      itemsTotal,
      customerPendingAmount,
      pendingPaid,
      orderTotalAmount
    });

    // Reduce product quantities
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product && product.variants) {
        const variantSize = item.unit || '';
        const variantIndex = variantSize
          ? product.variants.findIndex((v: any) => v.size === variantSize)
          : 0;
        
        if (variantIndex >= 0) {
          product.variants[variantIndex].stock = Math.max(0, (product.variants[variantIndex].stock || 0) - item.quantity);
          await product.save();
        }
      }
    }

    const order = new Order({
      customer: customerId,
      items,
      totalAmount: orderTotalAmount,
      pendingPayments: customerPendingAmount,
      pendingPaid: Boolean(pendingPaid),
      barcode: uuidv4(),
      status: 'Pending',
      personalized,
      paymentMethod,
    });

    await order.save();
    
    console.log('💾 BACKEND ORDER SAVED:', {
      orderId: order._id,
      pendingPaid: order.pendingPaid,
      totalAmount: order.totalAmount,
      pendingPayments: order.pendingPayments
    });
    
    // Clear customer pending payments if collected
    if (pendingPaid && customerPendingAmount > 0) {
      try {
        customer.pendingPayments = 0;
        await customer.save();
        console.log(`✅ Cleared customer pending payments: ${customer.name}`);
      } catch (e) {
        console.warn('Failed to clear customer pendingPayments:', e && (e as Error).message);
      }
    }
    
    // FIXED: Use .lean() and manually include pendingPaid in the populated response
    const populatedOrder = await Order.findById(order._id)
      .populate('customer')
      .lean();
    
    // Ensure pendingPaid is included in the response
    const responseOrder = {
      ...populatedOrder,
      pendingPaid: order.pendingPaid // Explicitly include this field
    };
    
    console.log('📤 BACKEND RESPONSE ORDER:', {
      orderId: responseOrder._id,
      pendingPaid: responseOrder.pendingPaid,
      totalAmount: responseOrder.totalAmount
    });
    
    io.emit('orderCreated', responseOrder);
    
    // Emit product and customer updates
    for (const item of items) {
      const updatedProduct = await Product.findById(item.productId);
      if (updatedProduct) {
        io.emit('productUpdated', updatedProduct);
      }
    }

    if (pendingPaid && customerPendingAmount > 0) {
      io.emit('customerUpdated', customer);
    }

    if (customer.email) {
      await sendInvoiceEmail(customer.email, 'New Order Confirmation', '<p>Your order is ready for packing.</p>');
    }
    
    res.status(201).json(responseOrder);
  } catch (error: any) {
    console.error('❌ Failed to create order:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /api/orders/:id - Fixed to include pendingPaid
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('customer').lean();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Ensure pendingPaid field is present
    const orderWithPendingPaid = {
      ...order,
      pendingPaid: order.pendingPaid || false
    };
    
    res.json(orderWithPendingPaid);
  } catch (error: any) {
    console.error('Failed to fetch order:', error.message);
    res.status(500).json({ error: 'Failed to fetch order' });
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
    
    // FIXED: Include pendingPaid in the response
    const populatedOrder = await Order.findById(order._id).populate('customer').lean();
    const responseOrder = {
      ...populatedOrder,
      pendingPaid: order.pendingPaid
    };
    
    io.emit('orderUpdated', responseOrder);
    res.json(responseOrder);
  } catch (error: any) {
    console.error('Failed to update order:', error.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { createdAt, shippingAddress, status, packerId } = req.body;
    
    if (createdAt) {
      order.createdAt = new Date(createdAt);
    }
    
    if (shippingAddress) {
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
    
    // FIXED: Include pendingPaid in the response
    const populatedOrder = await Order.findById(order._id).populate('customer').lean();
    const responseOrder = {
      ...populatedOrder,
      pendingPaid: order.pendingPaid
    };
    
    const io = req.app.get('io');
    if (io) {
      io.emit('orderUpdated', responseOrder);
    }
    
    res.json(responseOrder);
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
    
    order.packer = packerId || '';
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
        try { const ioRef = (req.app as any).get('io'); ioRef?.emit && ioRef.emit('packers:updated', p); } catch (e) { console.warn('emit failed', e); }
      }
    } catch (e) { console.warn('Failed to update packer status', e); }

    const token = jwt.sign({ packerId: packerId || '', orderId: order._id }, JWT_SECRET, { expiresIn: '24h' });
    const packingUrl = `${req.get('origin')}/packing?token=${token}`;

    // FIXED: Include pendingPaid in the emitted order
    const populatedOrder = await Order.findById(order._id).populate('customer').lean();
    const responseOrder = {
      ...populatedOrder,
      pendingPaid: order.pendingPaid
    };
    
    io.emit('orderUpdated', responseOrder);
    
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

    const orders = await Order.find(query).populate('customer').lean();
    
    // FIXED: Include pendingPaid in packing orders
    const ordersWithPendingPaid = orders.map(order => ({
      ...order,
      pendingPaid: order.pendingPaid || false
    }));
    
    res.json({ orders: ordersWithPendingPaid, packerId });
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
    
    // FIXED: Include pendingPaid in the response
    const populatedOrder = await Order.findById(order._id).populate('customer').lean();
    const responseOrder = {
      ...populatedOrder,
      pendingPaid: order.pendingPaid
    };
    
    if (populatedOrder && (populatedOrder as any).customer && (populatedOrder as any).customer.email) {
      await sendInvoiceEmail((populatedOrder as any).customer.email, `Packed Order Invoice #${order._id}`, '<p>Your order has been packed.</p>');
    }
    io.emit('orderUpdated', responseOrder);
    res.json({ message: 'Order marked as packed' });
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

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
        
        const updatedProduct = await Product.findById((item as any).productId);
        if (updatedProduct) {
          io.emit('productUpdated', updatedProduct);
        }
      }
    }

    try {
      const PackingAssignment = require('../models/PackingAssignment').default;
      await PackingAssignment.deleteMany({ orderId: order._id });
    } catch (e: any) {
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
    
    // FIXED: Include pendingPaid in the response
    const populatedOrder = await Order.findById(order._id).populate('customer').lean();
    const responseOrder = {
      ...populatedOrder,
      pendingPaid: order.pendingPaid
    };

    io.emit('orderUpdated', responseOrder);
    for (const item of items) {
      const updatedProduct = await Product.findById((item as any).productId);
      if (updatedProduct) {
        io.emit('productUpdated', updatedProduct);
      }
    }

    res.json(responseOrder);
  } catch (error: any) {
    console.error('Failed to update order items:', error.message);
    res.status(500).json({ error: 'Failed to update order items' });
  }
});

export default router;