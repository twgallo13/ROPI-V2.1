"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeHandler = describeHandler;
const describe_1 = __importDefault(require("../routes/describe"));
// The describe app already has all the logic built in as an Express app
// We can just use it directly as a handler
async function describeHandler(req, res) {
    // The describe route is already an Express app, so we pass through
    // This handler is a thin wrapper for consistency with other handlers
    return (0, describe_1.default)(req, res, () => { });
}
exports.default = describeHandler;
