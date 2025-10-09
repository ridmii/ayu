"use strict";
// WhatsApp Service with mock functionality (server-side safe)
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = void 0;
class WhatsAppService {
    constructor() {
        this.adminPhoneNumber = process.env.REACT_APP_ADMIN_PHONE_NUMBER || '+1234567890';
        this.isProduction = process.env.NODE_ENV === 'production';
    }
    sendLowStockAlert(alertData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const message = this.formatLowStockMessage(alertData);
                if (this.isProduction) {
                    // In production you'd call your real backend or provider here.
                    console.log('Would send real WhatsApp message to', this.adminPhoneNumber);
                }
                else {
                    // Mock implementation for development
                    yield this.mockSendWhatsApp(message);
                }
                console.log('Low stock alert processed successfully');
            }
            catch (error) {
                console.error('Failed to send low stock alert:', error);
                // Don't throw error in development to avoid breaking the app
                if (this.isProduction) {
                    throw new Error('Failed to send low stock alert');
                }
            }
        });
    }
    mockSendWhatsApp(message) {
        return __awaiter(this, void 0, void 0, function* () {
            // Simulate API call delay
            yield new Promise(resolve => setTimeout(resolve, 1000));
            // Log the message that would be sent
            console.log('📱 MOCK WHATSAPP MESSAGE:');
            console.log('='.repeat(50));
            console.log(message);
            console.log('='.repeat(50));
            console.log('(In production, this would be sent via WhatsApp)');
            // You could also show this in the UI for testing
            this.showMockNotification(message);
        });
    }
    showMockNotification(message) {
        // Server-side mock notification: just log it
        console.log('MOCK WHATSAPP NOTIFICATION:', message);
    }
    formatLowStockMessage(data) {
        const urgency = data.status === 'critical' ? '🚨 URGENT: CRITICAL STOCK' : '⚠️ LOW STOCK ALERT';
        const statusEmoji = data.status === 'critical' ? '🔴' : '🟡';
        return `${urgency}

${statusEmoji} *${data.materialName}*
📊 Current Stock: ${data.currentQuantity} ${data.unit}
📉 Threshold: ${data.threshold} ${data.unit}
📈 Status: ${data.status.toUpperCase()}

Please restock immediately to avoid production delays.

🏭 Inventory Management System
${new Date().toLocaleString()}`;
    }
    checkAndSendLowStockAlerts(materials) {
        return __awaiter(this, void 0, void 0, function* () {
            const lowStockMaterials = materials.filter(material => material.status === 'low' || material.status === 'critical');
            if (lowStockMaterials.length === 0) {
                console.log('No low stock materials found');
                return;
            }
            console.log(`Found ${lowStockMaterials.length} low stock materials`);
            for (const material of lowStockMaterials) {
                try {
                    yield this.sendLowStockAlert({
                        materialName: material.name,
                        currentQuantity: material.usableQuantity,
                        threshold: material.lowStockThreshold,
                        unit: material.unit,
                        status: material.status
                    });
                    // Add delay between messages
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (error) {
                    console.error(`Failed to send alert for ${material.name}:`, error);
                }
            }
        });
    }
    // Method to test WhatsApp integration
    testWhatsAppIntegration() {
        return __awaiter(this, void 0, void 0, function* () {
            const testData = {
                materialName: 'Test Material',
                currentQuantity: 50,
                threshold: 100,
                unit: 'kg',
                status: 'low'
            };
            yield this.sendLowStockAlert(testData);
        });
    }
    // Optional email fallback (server-safe): logs the message
    sendEmailFallback(alertData) {
        return __awaiter(this, void 0, void 0, function* () {
            const subject = `Low Stock Alert: ${alertData.materialName}`;
            const body = this.formatLowStockMessage(alertData);
            console.log('EMAIL ALERT (Fallback) Subject:', subject);
            console.log('EMAIL ALERT (Fallback) Body:', body);
        });
    }
}
exports.whatsappService = new WhatsAppService();
