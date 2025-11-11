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
exports.seedSettingsVocab = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Vocab sets to seed
const sets = {
    primaryColors: ['Black', 'White', 'Red', 'Blue'],
    descriptiveColors: ['Rose Gold', 'Patent-leather'],
    cutTypes: ['Low', 'Mid', 'High'],
    closureTypes: ['Lace-up', 'Buckle', 'Zip-up'],
    heelHeights: ['0–1"', '2–3"', '4–5"', '5"+'],
    platformHeights: ['Flat', 'Medium (1–2")', 'High (2–3")'],
};
// slug helper
const slug = (s) => (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
exports.seedSettingsVocab = functions.https.onRequest(async (req, res) => {
    try {
        const token = req.header('x-seed-token');
        if (token !== process.env.SEED_TOKEN) {
            res.status(401).json({ ok: false, error: 'unauthorized' });
            return;
        }
        const db = admin.firestore();
        const counts = {};
        for (const [key, items] of Object.entries(sets)) {
            let n = 0;
            for (const label of items) {
                const id = slug(label);
                await db.doc(`settings/${key}/items/${id}`).set({
                    value: label,
                    label,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                n++;
            }
            counts[key] = n;
        }
        res.json({ ok: true, counts });
        return;
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e?.message || e) });
        return;
    }
});
