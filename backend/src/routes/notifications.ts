import { Router, Request, Response } from 'express';
import twilio from 'twilio';

const router = Router();

// Twilio configuration - you'll get these from your Twilio account
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_WHATSAPP_NUMBER;

const client = twilio(accountSid, authToken);

interface WhatsAppMessage {
  to: string;
  message: string;
}

router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    const { to, message }: WhatsAppMessage = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing "to" or "message" in request body'
      });
    }

    // Send WhatsApp message via Twilio
    const result = await client.messages.create({
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
  } catch (error: any) {
    console.error('WhatsApp API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send WhatsApp message'
    });
  }
});

export default router;