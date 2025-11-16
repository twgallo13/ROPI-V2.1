"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Validator API Endpoint
 */
const express_1 = __importDefault(require("express"));
const admin = __importStar(require("firebase-admin"));
const validator_1 = require("./validator");
const app = (0, express_1.default)();
// Debug logging middleware - log incoming paths first
app.use((req, res, next) => {
    console.log('HOSTING DEBUG - PATHS:', {
        originalUrl: req.originalUrl,
        url: req.url,
        path: req.path,
        method: req.method,
        headers: {
            host: req.headers.host,
            'x-forwarded-host': req.headers['x-forwarded-host'],
            'x-original-url': req.headers['x-original-url'] || null
        }
    });
    next();
});
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
// Route handler function
const handleValidate = async (req, res) => {
    try {
        const { productId, product } = req.body;
        let productData = product;
        // If productId provided, fetch from Firestore
        if (productId && !product) {
            const db = admin.firestore();
            const productDoc = await db.collection('products').doc(productId).get();
            if (!productDoc.exists) {
                return res.status(404).json({ error: 'Product not found' });
            }
            productData = { id: productDoc.id, ...productDoc.data() };
        }
        if (!productData) {
            return res.status(400).json({ error: 'Product data or productId required' });
        }
        const result = (0, validator_1.validateProduct)(productData);
        res.json(result);
    }
    catch (error) {
        console.error('Validator API error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
// Register handler for all path variations from firebase.json
app.post('/', handleValidate);
app.post('/apiValidate', handleValidate);
app.post('/api/validate', handleValidate);
app.post('/validate', handleValidate);
exports.default = app;
