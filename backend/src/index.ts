import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import rawMaterialsRoutes from './routes/rawMaterials';
import productsRoutes from './routes/products';
import ordersRoutes from './routes/orders';
import invoicesRoutes from './routes/invoices';
import customersRoutes from './routes/customers';
import usersRoutes from './routes/users';
import packingRoutes, { setupPackingRoutes } from './routes/packing';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173' },
});

app.use(cors());
app.use(express.json());

app.use('/api/raw-materials', rawMaterialsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/packing', setupPackingRoutes(io));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected'));
});

mongoose.connect(process.env.MONGODB_URI!)
  .then(() => {
    server.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => console.error('MongoDB connection error:', err));