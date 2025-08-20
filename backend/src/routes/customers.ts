import express from 'express';
import Customer from '../models/Customer';
import { requireAdmin } from '../middleware/auth';

const router = express.Router();

// Add customer
router.post('/', requireAdmin, async (req, res) => {
  const { name, phone } = req.body;
  try {
    const customer = new Customer({ name, phone });
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add customer' });
  }
});

// Get all customers
router.get('/', requireAdmin, async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

export default router;