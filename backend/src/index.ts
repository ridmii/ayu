// index.ts (updated - add packers routes and dependencies)
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import rawMaterialsRoutes from './routes/rawMaterials';
import ordersRoutes from './routes/orders';
import customersRoutes from './routes/customers';
import productsRouter from './routes/products';
import packersRoutes from './routes/packers'; // New
import packingRoutes from './routes/packing'; // Updated
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// expose io via app so routes can emit without circular imports
app.set('io', io);

app.use('/api/raw-materials', rawMaterialsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/products', productsRouter);
app.use('/api/packers', packersRoutes); // New
app.use('/api/packing', packingRoutes); // Updated

console.log("Using MongoDB URI:", process.env.MONGODB_URI);


mongoose
  .connect(process.env.MONGODB_URI || 'mongodb+srv://auracatcode_db_user:GrFMcN76mITMDkp1@cluster0.ruqmk8t.mongodb.net/ayusys?retryWrites=true&w=majority&appName=AyuSys')
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((error: any) => console.error('MongoDB connection error:', error.message));

server.listen(5000, () => {
  console.log('Server running on port 5000');
});

try {
  const packersRoutes = require('./routes/packers').default;  // Fallback to CommonJS if ESM issues
  app.use('/api/packers', packersRoutes);
} catch (err) {
  console.error('Failed to import packersRoutes:', err);
}