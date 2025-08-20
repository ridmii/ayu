import { Router } from 'express';
import RawMaterial from '../models/RawMaterial';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const rawMaterials = await RawMaterial.find();
    res.json(rawMaterials);
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    res.status(500).json({ error: 'Failed to fetch raw materials' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, initialQuantity, unit, lowStockThreshold } = req.body;
  try {
    if (!name || !initialQuantity || !unit || !lowStockThreshold) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const rawMaterial = new RawMaterial({
      name,
      initialQuantity,
      processedQuantity: initialQuantity,
      wastage: 0,
      usableQuantity: initialQuantity,
      unit,
      lowStockThreshold,
    });
    await rawMaterial.save();
    res.status(201).json(rawMaterial);
  } catch (error) {
    console.error('Error adding raw material:', error);
    res.status(500).json({ error: 'Failed to add raw material' });
  }
});

router.post('/process', requireAdmin, async (req, res) => {
  const { materialId, processedQuantity } = req.body;
  try {
    if (!materialId || processedQuantity == null) {
      return res.status(400).json({ error: 'materialId and processedQuantity are required' });
    }
    const rawMaterial = await RawMaterial.findById(materialId);
    if (!rawMaterial) {
      return res.status(404).json({ error: 'Raw material not found' });
    }
    if (processedQuantity > rawMaterial.initialQuantity) {
      return res.status(400).json({ error: 'Processed quantity cannot exceed initial quantity' });
    }
    rawMaterial.processedQuantity = processedQuantity;
    rawMaterial.wastage = rawMaterial.initialQuantity - processedQuantity;
    rawMaterial.usableQuantity = processedQuantity;
    await rawMaterial.save();
    res.json(rawMaterial);
  } catch (error) {
    console.error('Error processing raw material:', error);
    res.status(500).json({ error: 'Failed to process raw material' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { initialQuantity, processedQuantity, wastage, unit, lowStockThreshold } = req.body;
  try {
    const rawMaterial = await RawMaterial.findById(id);
    if (!rawMaterial) {
      return res.status(404).json({ error: 'Raw material not found' });
    }
    if (initialQuantity != null) rawMaterial.initialQuantity = initialQuantity;
    if (processedQuantity != null) {
      rawMaterial.processedQuantity = processedQuantity;
      rawMaterial.wastage = initialQuantity != null ? initialQuantity - processedQuantity : rawMaterial.initialQuantity - processedQuantity;
      rawMaterial.usableQuantity = processedQuantity;
    }
    if (wastage != null) rawMaterial.wastage = wastage;
    if (unit) rawMaterial.unit = unit;
    if (lowStockThreshold != null) rawMaterial.lowStockThreshold = lowStockThreshold;
    await rawMaterial.save();
    res.json(rawMaterial);
  } catch (error) {
    console.error('Error updating raw material:', error);
    res.status(500).json({ error: 'Failed to update raw material' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const rawMaterial = await RawMaterial.findByIdAndDelete(id);
    if (!rawMaterial) {
      return res.status(404).json({ error: 'Raw material not found' });
    }
    res.json({ message: 'Raw material deleted' });
  } catch (error) {
    console.error('Error deleting raw material:', error);
    res.status(500).json({ error: 'Failed to delete raw material' });
  }
});

export default router;