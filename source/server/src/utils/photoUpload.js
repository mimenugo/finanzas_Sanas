import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PHOTO_MAX_SIZE = 7 * 1024 * 1024;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/jpg', 'image/webp']);

const safeName = (name) =>
  path.basename(name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');

export const validatePhoto = (file, label = 'fotografia') => {
  if (!file) return `La ${label} es obligatoria.`;

  if (file.size > PHOTO_MAX_SIZE) {
    return `La ${label} supera el limite de 7 MB.`;
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    return `La ${label} debe ser una imagen JPG, PNG o WEBP.`;
  }

  return null;
};

export const savePhoto = async (file, folder) => {
  const uploadDir = path.join(__dirname, `../../uploads/${folder}`);
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${safeName(file.name)}`;
  const filePath = path.join(uploadDir, fileName);
  await file.mv(filePath);

  return {
    url: `/uploads/${folder}/${fileName}`,
    name: file.name,
    mimeType: file.mimetype,
    size: file.size,
  };
};
