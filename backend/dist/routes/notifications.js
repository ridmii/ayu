"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const twilio_1 = __importDefault(require("twilio"));
const router = (0, express_1.Router)();
// Twilio configuration - you'll get these from your Twilio account
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const client = (0, twilio_1.default)(accountSid, authToken);
router.post('/whatsapp', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { to, message } = req.body;
        if (!to || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing "to" or "message" in request body'
            });
        }
        // Send WhatsApp message via Twilio
        const result = yield client.messages.create({
            body: message,
            from: `whatsapp:${twilioPhoneNumber}`,
            to: `whatsapp:${to}`
        });
        console.log('WhatsApp message sent successfully:', result.sid);
        res.json({
            success: true,
            messageId: result.sid,
            message: 'WhatsApp message sent successfully'
        });
    }
    catch (error) {
        console.error('WhatsApp API error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send WhatsApp message'
        });
    }
}));
exports.default = router;
