"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const rawMaterials_1 = __importDefault(require("./routes/rawMaterials"));
const products_1 = __importDefault(require("./routes/products"));
const orders_1 = __importDefault(require("./routes/orders"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const customers_1 = __importDefault(require("./routes/customers"));
const users_1 = __importDefault(require("./routes/users"));
const packing_1 = require("./routes/packing");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173' },
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/raw-materials', rawMaterials_1.default);
app.use('/api/products', products_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/invoices', invoices_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/users', users_1.default);
app.use('/api/packing', (0, packing_1.setupPackingRoutes)(io));
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected'));
});
mongoose_1.default.connect(process.env.MONGODB_URI)
    .then(() => {
    server.listen(process.env.PORT || 5000, () => {
        console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
})
    .catch((err) => console.error('MongoDB connection error:', err));
