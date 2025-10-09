"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
// index.ts (updated - add packers routes and dependencies)
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const rawMaterials_1 = __importDefault(require("./routes/rawMaterials"));
const orders_1 = __importDefault(require("./routes/orders"));
const customers_1 = __importDefault(require("./routes/customers"));
const products_1 = __importDefault(require("./routes/products"));
const packers_1 = __importDefault(require("./routes/packers")); // New
const packing_1 = __importDefault(require("./routes/packing")); // Updated
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    },
});
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173',
    credentials: true,
}));
app.use(express_1.default.json());
// expose io via app so routes can emit without circular imports
app.set('io', exports.io);
app.use('/api/raw-materials', rawMaterials_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/products', products_1.default);
app.use('/api/packers', packers_1.default); // New
app.use('/api/packing', packing_1.default); // Updated
mongoose_1.default
    .connect(process.env.MONGODB_URI || 'mongodb+srv://ridmi:ayu123@ayusys.moyaii5.mongodb.net/?retryWrites=true&w=majority&appName=AyuSys')
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch((error) => console.error('MongoDB connection error:', error.message));
server.listen(5000, () => {
    console.log('Server running on port 5000');
});
try {
    const packersRoutes = require('./routes/packers').default; // Fallback to CommonJS if ESM issues
    app.use('/api/packers', packersRoutes);
}
catch (err) {
    console.error('Failed to import packersRoutes:', err);
}
