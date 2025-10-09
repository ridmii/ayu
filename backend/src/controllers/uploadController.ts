import { Request, Response } from 'express';
   import { v4 as uuidv4 } from 'uuid';
   import fs from 'fs';
   import path from 'path';
   // Accept a loose req type because express-fileupload adds a `files` property
   export const uploadFile = async (req: any, res: Response) => {
     try {
       if (!req.files || !req.files.file) {
         return res.status(400).json({ error: 'No file uploaded' });
       }
       const file = req.files.file as any;
       const fileName = `${uuidv4()}-${file.name}`;
       const filePath = path.join(__dirname, '../../Uploads', fileName);
       await file.mv(filePath);
       const publicUrl = `${req.protocol}://${req.get('host')}/Uploads/${fileName}`;
       res.json({ url: publicUrl });
     } catch (error: any) {
       console.error('File upload error:', error);
       res.status(500).json({ error: 'Failed to upload file' });
     }
   };