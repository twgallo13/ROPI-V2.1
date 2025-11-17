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
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartDetectHandler = smartDetectHandler;
const admin = __importStar(require("firebase-admin"));
const smartDetect_1 = require("../smartDetect");
async function smartDetectHandler(req, res) {
    try {
        const { productId, product } = req.body;
        let productData = product;
        // If productId provided, fetch from Firestore
        if (productId && !product) {
            const db = admin.firestore();
            const productDoc = await db.collection('products').doc(productId).get();
            if (!productDoc.exists) {
                res.status(404).json({ error: 'Product not found' });
                return;
            }
            productData = { id: productDoc.id, ...productDoc.data() };
        }
        if (!productData) {
            res.status(400).json({ error: 'Product data or productId required' });
            return;
        }
        const result = (0, smartDetect_1.runSmartDetect)(productData);
        res.json(result);
    }
    catch (error) {
        console.error('Smart Detect API error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
exports.default = smartDetectHandler;
