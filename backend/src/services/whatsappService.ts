// WhatsApp Service with mock functionality (server-side safe)

interface LowStockAlertData {
  materialName: string;
  currentQuantity: number;
  threshold: number;
  unit: string;
  status: 'low' | 'critical';
}

class WhatsAppService {
  private adminPhoneNumber: string = process.env.REACT_APP_ADMIN_PHONE_NUMBER || '+1234567890';
  private isProduction: boolean = process.env.NODE_ENV === 'production';

  async sendLowStockAlert(alertData: LowStockAlertData): Promise<void> {
    try {
      const message = this.formatLowStockMessage(alertData);
      
        if (this.isProduction) {
          // In production you'd call your real backend or provider here.
          console.log('Would send real WhatsApp message to', this.adminPhoneNumber);
        } else {
          // Mock implementation for development
          await this.mockSendWhatsApp(message);
        }
      
      console.log('Low stock alert processed successfully');
    } catch (error) {
      console.error('Failed to send low stock alert:', error);
      // Don't throw error in development to avoid breaking the app
      if (this.isProduction) {
        throw new Error('Failed to send low stock alert');
      }
    }
  }

  private async mockSendWhatsApp(message: string): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log the message that would be sent
    console.log('📱 MOCK WHATSAPP MESSAGE:');
    console.log('=' .repeat(50));
    console.log(message);
    console.log('=' .repeat(50));
    console.log('(In production, this would be sent via WhatsApp)');
    
    // You could also show this in the UI for testing
    this.showMockNotification(message);
  }

  private showMockNotification(message: string): void {
    // Server-side mock notification: just log it
    console.log('MOCK WHATSAPP NOTIFICATION:', message);
  }

  private formatLowStockMessage(data: LowStockAlertData): string {
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

  async checkAndSendLowStockAlerts(materials: any[]): Promise<void> {
    const lowStockMaterials = materials.filter(material => 
      material.status === 'low' || material.status === 'critical'
    );

    if (lowStockMaterials.length === 0) {
      console.log('No low stock materials found');
      return;
    }

    console.log(`Found ${lowStockMaterials.length} low stock materials`);

    for (const material of lowStockMaterials) {
      try {
        await this.sendLowStockAlert({
          materialName: material.name,
          currentQuantity: material.usableQuantity,
          threshold: material.lowStockThreshold,
          unit: material.unit,
          status: material.status
        });
        
        // Add delay between messages
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to send alert for ${material.name}:`, error);
      }
    }
  }

  // Method to test WhatsApp integration
  async testWhatsAppIntegration(): Promise<void> {
    const testData: LowStockAlertData = {
      materialName: 'Test Material',
      currentQuantity: 50,
      threshold: 100,
      unit: 'kg',
      status: 'low'
    };

    await this.sendLowStockAlert(testData);
  }

  // Optional email fallback (server-safe): logs the message
  private async sendEmailFallback(alertData: LowStockAlertData): Promise<void> {
    const subject = `Low Stock Alert: ${alertData.materialName}`;
    const body = this.formatLowStockMessage(alertData);
    console.log('EMAIL ALERT (Fallback) Subject:', subject);
    console.log('EMAIL ALERT (Fallback) Body:', body);
  }
}

export const whatsappService = new WhatsAppService();