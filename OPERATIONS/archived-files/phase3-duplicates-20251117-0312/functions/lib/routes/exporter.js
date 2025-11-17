"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.get('*', (_req, res) => {
    res.json({ ok: true, route: 'exporter', message: 'Exporter endpoint ready' });
});
exports.default = app;
