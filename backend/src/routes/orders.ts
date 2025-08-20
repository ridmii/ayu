import express from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import RawMaterial from '../models/RawMaterial';
import { requireAdmin } from '../middleware/auth';

const router = express.Router();

// Create order
router.post('/', requireAdmin, async (req, res) => {
  const { customerId, items, personalizedItems } = req.body;
  try {
    let totalAmount = 0;

    // Calculate total for standard items
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ error: `Product ${item.productId} not found` });
      totalAmount += product.price * item.quantity;
      // Update product quantity
      product.quantity -= item.quantity;
      await product.save();
    }

    // Calculate total for personalized items and update raw materials
    for (const item of personalizedItems) {
      totalAmount += item.price * item.quantity;
      for (const raw of item.rawMaterials) {
        const material = await RawMaterial.findById(raw.materialId);
        if (!material) return res.status(404).json({ error: `Raw material ${raw.materialId} not found` });
        material.processedQuantity -= raw.quantityUsed;
        await material.save();
      }
    }

    const order = new Order({ customerId, items, personalizedItems, totalAmount });
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get all orders
router.get('/', requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate('customerId items.productId');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

export default router;