// Font loading utility
export const loadFonts = async (): Promise<{ regular: string; bold: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Loading Sinhala fonts...');
      
      // Load regular font
      const regularResponse = await fetch('/fonts/NotoSansSinhala-Regular.ttf');
      if (!regularResponse.ok) throw new Error('Failed to load regular font');
      const regularBuffer = await regularResponse.arrayBuffer();
      
      // Load bold font  
      const boldResponse = await fetch('/fonts/NotoSansSinhala-Bold.ttf');
      if (!boldResponse.ok) throw new Error('Failed to load bold font');
      const boldBuffer = await boldResponse.arrayBuffer();
      
      // Convert to base64
      const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
      };
      
      const regularBase64 = arrayBufferToBase64(regularBuffer);
      const boldBase64 = arrayBufferToBase64(boldBuffer);
      
      console.log('✓ Sinhala fonts loaded successfully');
      resolve({ regular: regularBase64, bold: boldBase64 });
      
    } catch (error) {
      console.error('Failed to load fonts:', error);
      reject(error);
    }
  });
};