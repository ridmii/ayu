import twilio from 'twilio';

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendSMS = async (message: string) => {
  await client.messages.create({
    body: message,
    to: process.env.OWNER_PHONE!,
    from: process.env.TWILIO_PHONE!,
  });
};

export const sendWhatsApp = async (message: string, mediaUrl?: string, toPhone: string = process.env.OWNER_PHONE!) => {
  await client.messages.create({
    body: message,
    to: `whatsapp:${toPhone}`,
    from: `whatsapp:${process.env.TWILIO_PHONE}`,
    mediaUrl: mediaUrl ? [mediaUrl] : undefined,
  });
};