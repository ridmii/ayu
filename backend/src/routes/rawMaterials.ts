import { Router } from 'express';
import mongoose from 'mongoose';
import RawMaterial from '../models/RawMaterial';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'MongoDB not connected' });
    }
    const rawMaterials = await RawMaterial.find();
    res.json(rawMaterials);
  } catch (error: any) {
    console.error('Failed to fetch raw materials:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to fetch raw materials' });
  }
});

router.post('/', async (req, res) => {
  const { name, initialQuantity, unit, lowStockThreshold } = req.body;
  try {
    if (!name || !initialQuantity || !unit || !lowStockThreshold) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'MongoDB not connected' });
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
  } catch (error: any) {
    console.error('Failed to add raw material:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to add raw material' });
  }
});

router.post('/process', async (req, res) => {
  const { materialId, processedQuantity } = req.body;
  try {
    if (!materialId || processedQuantity == null) {
      return res.status(400).json({ error: 'Material ID and processed quantity are required' });
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'MongoDB not connected' });
    }
    const rawMaterial = await RawMaterial.findById(materialId);
    if (!rawMaterial) {
      return res.status(404).json({ error: 'Raw material not found' });
    }
    if (processedQuantity > rawMaterial.initialQuantity) {
      return res.status(400).json({ error: 'Processed quantity exceeds initial quantity' });
    }
    rawMaterial.processedQuantity = processedQuantity;
    rawMaterial.wastage = rawMaterial.initialQuantity - processedQuantity;
    rawMaterial.usableQuantity = processedQuantity;
    await rawMaterial.save();
    res.json(rawMaterial);
  } catch (error: any) {
    console.error('Failed to process raw material:', {
      message: error.message,
      stack: error.stack,
      materialId,
      processedQuantity,
    });
    res.status(500).json({ error: 'Failed to process raw material' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'MongoDB not connected' });
    }
    const rawMaterial = await RawMaterial.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rawMaterial) {
      return res.status(404).json({ error: 'Raw material not found' });
    }
    res.json(rawMaterial);
  } catch (error: any) {
    console.error('Failed to update raw material:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to update raw material' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'MongoDB not connected' });
    }
    const rawMaterial = await RawMaterial.findByIdAndDelete(req.params.id);
    if (!rawMaterial) {
      return res.status(404).json({ error: 'Raw material not found' });
    }
    res.json({ message: 'Raw material deleted' });
  } catch (error: any) {
    console.error('Failed to delete raw material:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to delete raw material' });
  }
});

export default router;