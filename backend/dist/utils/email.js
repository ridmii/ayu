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
exports.sendInvoiceEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Only create transporter when credentials are provided
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer_1.default.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
}
else {
    console.warn('EMAIL_USER or EMAIL_PASS not set - email sending disabled');
}
// Make the extra data optional to match usages across the codebase
const sendInvoiceEmail = (to, subject, html, _extra) => __awaiter(void 0, void 0, void 0, function* () {
    if (!transporter) {
        // Gracefully skip sending if transporter not configured
        console.info(`Skipping sendInvoiceEmail to ${to} because email is not configured`);
        return;
    }
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html,
    };
    try {
        yield transporter.sendMail(mailOptions);
    }
    catch (err) {
        // Log error but don't throw - email failures should not block order creation
        console.error('Failed to send invoice email:', (err === null || err === void 0 ? void 0 : err.message) || err);
    }
});
exports.sendInvoiceEmail = sendInvoiceEmail;
