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
exports.seedMaterials = void 0;
const firestore_1 = require("firebase-admin/firestore");
const functions = __importStar(require("firebase-functions"));
const materials_json_1 = __importDefault(require("./materials.json"));
/**
 * Seed Materials vocabulary into Firestore
 * Path: /settings/materials/items/{id}
 */
async function seedMaterialsData() {
    const db = (0, firestore_1.getFirestore)();
    console.log('[seedMaterials] Starting materials vocabulary seed...');
    let added = 0;
    let skipped = 0;
    for (const item of materials_json_1.default.items) {
        try {
            // Normalize name: lowercase, trim, replace spaces with hyphens
            const slug = item.name
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');
            const docRef = db.collection('settings').doc('materials').collection('items').doc(slug);
            // Check if exists
            const exists = await docRef.get();
            if (exists.exists) {
                skipped++;
                continue;
            }
            // Write vocab item
            await docRef.set({
                value: slug,
                label: item.name,
                active: item.active !== false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            added++;
        }
        catch (error) {
            console.error(`[seedMaterials] Failed to seed material "${item.name}":`, error);
        }
    }
    console.log(`[seedMaterials] Complete. Added: ${added}, Skipped: ${skipped}`);
    return { added, skipped };
}
/**
 * Cloud function to seed materials vocabulary
 * Requires x-seed-token header for security
 */
exports.seedMaterials = functions.https.onRequest(async (req, res) => {
    try {
        const token = req.header('x-seed-token');
        if (token !== process.env.SEED_TOKEN) {
            res.status(401).json({ ok: false, error: 'unauthorized' });
            return;
        }
        const result = await seedMaterialsData();
        res.json({ ok: true, ...result });
    }
    catch (e) {
        console.error('[seedMaterials] Error:', e);
        res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
});
