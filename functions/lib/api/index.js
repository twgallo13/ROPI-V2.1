"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Consolidated API Router
 * Exposes all API endpoints under /api/* with unified CORS and error handling
 */
const express_1 = __importDefault(require("express"));
const smartDetect_1 = __importDefault(require("../handlers/smartDetect"));
const validate_1 = __importDefault(require("../handlers/validate"));
const describe_1 = __importDefault(require("../handlers/describe"));
const import_1 = __importDefault(require("../routes/import"));
const exporter_1 = __importDefault(require("../routes/exporter"));
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
    if (origin && (allowedOrigins.includes(origin) || /\.app\.github\.dev$/.test(origin))) {
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
// Parse JSON
app.use(express_1.default.json());
// Mount routes - wrap handlers to catch promise rejections
app.post('/api/smart-detect', (req, res, next) => {
    Promise.resolve((0, smartDetect_1.default)(req, res)).catch(next);
});
app.post('/api/validate', (req, res, next) => {
    Promise.resolve((0, validate_1.default)(req, res)).catch(next);
});
app.post('/api/describe', (req, res, next) => {
    Promise.resolve((0, describe_1.default)(req, res)).catch(next);
});
// Mount import and exporter subrouters
app.use('/api/import', import_1.default);
app.use('/api/exporter', exporter_1.default);
// Root endpoint for health checks
app.all('/', (req, res) => {
    res.status(200).json({
        ok: true,
        endpoints: [
            '/api/smart-detect',
            '/api/validate',
            '/api/describe',
            '/api/import',
            '/api/exporter'
        ]
    });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('[api] Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message || 'Unknown error'
    });
});
exports.default = app;
