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
exports.seedSettingsVocabHandler = seedSettingsVocabHandler;
const admin = __importStar(require("firebase-admin"));
// Ensure default app is initialized elsewhere (index.ts). Using the default app here.
const db = admin.firestore();
// Tiny slug helper: lowercase, trim, replace non-alphanumerics with hyphens
function slugify(input) {
    return (input || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
async function seedSettingsVocabHandler(req, res) {
    try {
        if (req.method !== 'POST') {
            res.status(405).json({ ok: false, error: 'Method Not Allowed' });
            return;
        }
        const token = req.header('x-seed-token');
        if (!token || token !== process.env.SEED_TOKEN) {
            res.status(401).json({ ok: false });
            return;
        }
        // Defaults to seed
        const payload = {
            primaryColors: ['Black', 'White', 'Red', 'Blue'],
            descriptiveColors: ['Rose Gold', 'Patent-leather'],
            cutTypes: ['Low', 'Mid', 'High'],
            closureTypes: ['Lace-up', 'Buckle', 'Zip-up'],
            heelHeights: ['0–1"', '2–3"', '4–5"', '5"+'],
            platformHeights: ['Flat', 'Medium (1–2")', 'High (2–3")'],
        };
        const counts = {};
        for (const [key, values] of Object.entries(payload)) {
            let n = 0;
            for (const label of values) {
                const value = label; // Store as-is
                const slug = slugify(value);
                const ref = db.doc(`settings/${key}/items/${slug}`);
                await ref.set({
                    value,
                    label,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                n += 1;
            }
            counts[key] = n;
        }
        res.json({ ok: true, counts });
        return;
    }
    catch (err) {
        console.error('[seedSettingsVocab] Error:', err);
        res.status(500).json({ ok: false, error: 'Internal Error' });
        return;
    }
}
