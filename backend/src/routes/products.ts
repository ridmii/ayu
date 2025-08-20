import express from 'express';
import Product from '../models/Product';
import { requireAdmin } from '../middleware/auth';

const router = express.Router();

// Add product
router.post('/', requireAdmin, async (req, res) => {
  const { name, quantity, price, rawMaterials } = req.body;
  try {
    const product = new Product({ name, quantity, price, rawMaterials });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Get all products
router.get('/', requireAdmin, async (req, res) => {
  try {
    const products = await Product.find().populate('rawMaterials.materialId');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

export default router;