"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const requireAdmin = (req, res, next) => {
    // Bypass authentication for demo
    req.user = { id: 'mock-user-id', role: 'admin' };
    next();
};
exports.requireAdmin = requireAdmin;
