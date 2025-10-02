import express from 'express';
import Product from '../models/Product';
import { requireAdmin } from '../middleware/auth';  // Keep, but optional for GET

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {  // Remove requireAdmin if testing without login
  try {
    const products = await Product.find().populate('rawMaterials.materialId');
    res.json(products);
  } catch (error: any) {
    console.error('Failed to fetch products:', error.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by barcode (for scanner lookup)
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error: any) {
    console.error('Failed to fetch product by barcode:', error.message);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Add product (updated fields)
router.post('/', requireAdmin, async (req, res) => {  // Keep auth for POST
  const { name, productId, unitPrice, barcode, quantity = 0, rawMaterials = [] } = req.body;  // Match frontend + defaults
  try {
    if (!name || !productId || !unitPrice || !barcode) {
      return res.status(400).json({ error: 'Name, Product ID, Unit Price, and Barcode are required' });
    }
    const existingBarcode = await Product.findOne({ barcode });
    if (existingBarcode) {
      return res.status(400).json({ error: 'Barcode already exists' });
    }
    const product = new Product({ name, productId, unitPrice, barcode, quantity, rawMaterials });
    await product.save();
    res.status(201).json(product);
  } catch (error: any) {
    console.error('Failed to add product:', error.message);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Update product
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, productId, unitPrice, barcode, quantity, rawMaterials } = req.body;
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, productId, unitPrice, barcode, quantity, rawMaterials },
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error: any) {
    console.error('Failed to update product:', error.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted' });
  } catch (error: any) {
    console.error('Failed to delete product:', error.message);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;