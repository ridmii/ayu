// routes/packers.ts
import { Router } from 'express';
import Packer from '../models/Packer';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const packers = await Packer.find();
    res.json(packers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch packers' });
  }
});

router.post('/', async (req, res) => {
  try {
    const packer = new Packer(req.body);
    await packer.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('packers:created', packer);
    }

    res.json(packer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create packer' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Packer.findByIdAndUpdate(
      id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Packer not found' });

    // Emit real-time update - FIXED: Use consistent socket emission
    const io = req.app.get('io');
    if (io) {
      io.emit('packers:updated', updated);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update packer' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Packer.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Packer not found' });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('packers:deleted', { _id: id });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete packer' });
  }
});

export default router;