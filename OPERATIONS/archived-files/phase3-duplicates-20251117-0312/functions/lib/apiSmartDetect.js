"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Smart Detect API Endpoint
 * Refactored to use handler module for consistency
 */
const express_1 = __importDefault(require("express"));
const smartDetect_1 = __importDefault(require("./handlers/smartDetect"));
const app = (0, express_1.default)();
// CORS for dev environments
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://ropi-bccee.web.app',
        'https://ropi-bccee.firebaseapp.com',
    ];
    // Allow any *.app.github.dev origin (Codespaces)
    if (origin && (allowedOrigins.includes(origin) || /\\.app\\.github\\.dev$/.test(origin))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});
app.use(express_1.default.json());
// Register handler for all path variations from firebase.json
app.post('/', smartDetect_1.default);
app.post('/apiSmartDetect', smartDetect_1.default);
app.post('/api/smart-detect', smartDetect_1.default);
app.post('/smart-detect', smartDetect_1.default);
exports.default = app;
