// routes/packers.ts (new file)
import { Router } from 'express';
import Packer from '../models/Packer';

const router = Router();
console.log('Packers route file loaded successfully');

router.get('/', async (req, res) => {
  console.log('GET /api/packers request received');  // Log when hit
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

  // Emit real-time update (get io from express app to avoid circular import)
  try { const io = (req.app as any).get('io'); io?.emit && io.emit('packers:created', packer); } catch (e) { console.warn('Socket emit failed', e); }

    res.json(packer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create packer' });
  }
});

// Update packer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Packer.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Packer not found' });

  // Emit real-time update (get io from express app to avoid circular import)
  try { const io = (req.app as any).get('io'); io?.emit && io.emit('packers:updated', updated); } catch (e) { console.warn('Socket emit failed', e); }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update packer' });
  }
});

// Delete packer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Packer.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Packer not found' });

  // Emit real-time update (get io from express app to avoid circular import)
  try { const io = (req.app as any).get('io'); io?.emit && io.emit('packers:deleted', { _id: id }); } catch (e) { console.warn('Socket emit failed', e); }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete packer' });
  }
});

export default router;