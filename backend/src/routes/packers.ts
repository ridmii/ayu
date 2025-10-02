// routes/packers.ts (new file)
import { Router } from 'express';
import Packer from '../models/packer';

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
    res.json(packer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create packer' });
  }
});

export default router;