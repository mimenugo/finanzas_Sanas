import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CUSTOMER_DOCUMENT_MAX_SIZE = 7 * 1024 * 1024;

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
]);

const safeName = (name) =>
  path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');

const getExtension = (file) => {
  const extension = path.extname(file.name || '').toLowerCase();
  if (extension) return extension;
  if (file.mimetype === 'application/pdf') return '.pdf';
  if (file.mimetype === 'image/png') return '.png';
  if (file.mimetype === 'image/webp') return '.webp';
  return '.jpg';
};

export const validateCustomerDocument = (file) => {
  if (!file) return null;

  if (file.size > CUSTOMER_DOCUMENT_MAX_SIZE) {
    return 'El archivo supera el limite de 7 MB.';
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    return 'Solo se permiten archivos PDF o imagenes (JPG, PNG, WEBP).';
  }

  return null;
};

const saveLocal = async (file, folder = 'customer-documents') => {
  const uploadDir = path.join(__dirname, `../../uploads/${folder}`);
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${safeName(file.name || `document${getExtension(file)}`)}`;
  const filePath = path.join(uploadDir, fileName);
  await file.mv(filePath);

  return {
    url: `/uploads/${folder}/${fileName}`,
    name: file.name,
    mimeType: file.mimetype,
    size: file.size,
    storage: 'local',
    googleDriveFileId: null,
  };
};

const getDriveAccessToken = async () => {
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    },
    privateKey,
    { algorithm: 'RS256' }
  );

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Google token error: ${details}`);
  }

  const data = await response.json();
  return data.access_token;
};

const uploadToDrive = async (file, prefix = 'document') => {
  const accessToken = await getDriveAccessToken();

  if (!accessToken) {
    return null;
  }

  const metadata = {
    name: `${prefix}-${Date.now()}-${safeName(file.name || `document${getExtension(file)}`)}`,
  };

  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    metadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
  }

  const boundary = `credito-${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  const body = Buffer.concat([
    Buffer.from(
      `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`
    ),
    Buffer.from(`${delimiter}Content-Type: ${file.mimetype}\r\n\r\n`),
    file.data,
    Buffer.from(closeDelimiter),
  ]);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Google Drive upload error: ${details}`);
  }

  return response.json();
};

const normalizeUpload = (result, file) => ({
  url: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
  name: file.name,
  mimeType: file.mimetype,
  size: file.size,
  storage: 'google_drive',
  googleDriveFileId: result.id,
});

export const uploadCustomerDocument = async (file) => {
  const driveFile = await uploadToDrive(file, 'ine');

  if (driveFile) {
    const upload = normalizeUpload(driveFile, file);
    return {
      documentFileUrl: upload.url,
      documentFileName: upload.name,
      documentFileMimeType: upload.mimeType,
      documentFileSize: upload.size,
      documentFileStorage: upload.storage,
      googleDriveFileId: upload.googleDriveFileId,
    };
  }

  const upload = await saveLocal(file, 'customer-documents');
  return {
    documentFileUrl: upload.url,
    documentFileName: upload.name,
    documentFileMimeType: upload.mimeType,
    documentFileSize: upload.size,
    documentFileStorage: upload.storage,
    googleDriveFileId: upload.googleDriveFileId,
  };
};

export const uploadCustomerAddressProof = async (file) => {
  const driveFile = await uploadToDrive(file, 'address-proof');

  if (driveFile) {
    const upload = normalizeUpload(driveFile, file);
    return {
      addressProofFileUrl: upload.url,
      addressProofFileName: upload.name,
      addressProofFileMimeType: upload.mimeType,
      addressProofFileSize: upload.size,
      addressProofFileStorage: upload.storage,
      addressProofGoogleDriveFileId: upload.googleDriveFileId,
    };
  }

  const upload = await saveLocal(file, 'customer-address-proofs');
  return {
    addressProofFileUrl: upload.url,
    addressProofFileName: upload.name,
    addressProofFileMimeType: upload.mimeType,
    addressProofFileSize: upload.size,
    addressProofFileStorage: upload.storage,
    addressProofGoogleDriveFileId: upload.googleDriveFileId,
  };
};
