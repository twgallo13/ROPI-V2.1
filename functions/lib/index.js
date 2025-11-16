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
exports.exportRulesPreview = exports.setUserRole = exports.apiValidate = exports.apiSmartDetect = exports.apiExporter = exports.apiDescribe = exports.apiImport = exports.seedMaterials = exports.seedSettingsVocab = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const import_1 = __importDefault(require("./routes/import"));
const describe_1 = __importDefault(require("./routes/describe"));
const exporter_1 = __importDefault(require("./routes/exporter"));
const apiSmartDetect_1 = __importDefault(require("./apiSmartDetect"));
const apiValidate_1 = __importDefault(require("./apiValidate"));
var seedVocab_1 = require("./seedVocab");
Object.defineProperty(exports, "seedSettingsVocab", { enumerable: true, get: function () { return seedVocab_1.seedSettingsVocab; } });
var seedMaterials_1 = require("./seed/seedMaterials");
Object.defineProperty(exports, "seedMaterials", { enumerable: true, get: function () { return seedMaterials_1.seedMaterials; } });
admin.initializeApp();
const r = functions.region('us-central1');
exports.apiImport = functions.https.onRequest(import_1.default);
exports.apiDescribe = functions.https.onRequest(describe_1.default);
exports.apiExporter = functions.https.onRequest(exporter_1.default);
exports.apiSmartDetect = functions.https.onRequest(apiSmartDetect_1.default);
exports.apiValidate = functions.https.onRequest(apiValidate_1.default);
/**
 * Cloud function to set user role (admin or specialist)
 * Only callable by theo@shiekhshoes.org
 */
exports.setUserRole = r.https.onCall(async (data, context) => {
    const callerEmail = context.auth?.token?.email?.toLowerCase();
    if (!callerEmail) {
        throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
    }
    if (callerEmail !== 'theo@shiekhshoes.org') {
        throw new functions.https.HttpsError('permission-denied', 'Only Theo can modify roles');
    }
    const { uid, role } = data;
    if (!uid || !['admin', 'specialist'].includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', 'Bad params');
    }
    await admin.auth().setCustomUserClaims(uid, { admin: role === 'admin' });
    await admin.firestore().doc(`users/${uid}`).set({
        role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { ok: true };
});
/**
 * Cloud function to preview export rules
 * Returns sample product data with applied filters and transforms
 */
exports.exportRulesPreview = r.https.onCall(async (data, _ctx) => {
    const { schema, filters, transforms, limit = 5 } = data;
    const snap = await admin.firestore().collection('products').limit(limit).get();
    let rows = snap.docs.map(d => d.data());
    if (filters && Object.keys(filters).length) {
        rows = rows.filter(r => Object.entries(filters).every(([k, v]) => r[k] === v));
    }
    if (Array.isArray(transforms)) {
        for (const t of transforms) {
            if (!t?.field)
                continue;
            const field = t.field;
            rows = rows.map(r => {
                const val = (r[field] ?? '').toString();
                if (t.type === 'uppercase')
                    return { ...r, [field]: val.toUpperCase() };
                if (t.type === 'lowercase')
                    return { ...r, [field]: val.toLowerCase() };
                if (t.type === 'trim')
                    return { ...r, [field]: val.trim() };
                if (t.type === 'map' && t.map)
                    return { ...r, [field]: t.map[val] ?? val };
                return r;
            });
        }
    }
    const output = rows.map(r => schema.reduce((acc, f) => ({ ...acc, [f]: r[f] ?? '' }), {}));
    return { rows: output };
});
