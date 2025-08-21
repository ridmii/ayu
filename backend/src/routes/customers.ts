import { Router } from 'express';
import Customer from '../models/Customer';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (error: any) {
    console.error('Failed to fetch customers:', error.message);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/search', async (req, res) => {
  const { query } = req.query;
  try {
    const customers = await Customer.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
      ],
    });
    res.json(customers);
  } catch (error: any) {
    console.error('Failed to search customers:', error.message);
    res.status(500).json({ error: 'Failed to search customers' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, email, phone, address, pendingPayments } = req.body;
  try {
    if (!name || !email || !phone || !address) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }
    const customer = new Customer({
      name,
      email,
      phone,
      address,
      pendingPayments: pendingPayments || 0,
    });
    await customer.save();
    res.status(201).json(customer);
  } catch (error: any) {
    console.error('Failed to create customer:', error.message);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { name, email, phone, address, pendingPayments } = req.body;
  try {
    if (!name || !email || !phone || !address) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, address, pendingPayments: pendingPayments || 0 },
      { new: true }
    );
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error: any) {
    console.error('Failed to update customer:', error.message);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.status(204).json({});
  } catch (error: any) {
    console.error('Failed to delete customer:', error.message);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

export default router;