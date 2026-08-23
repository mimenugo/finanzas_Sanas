import crypto from 'crypto';

const normalizeDigits = (value) => String(value || '').replace(/\D/g, '');

const getEncryptionKey = () => {
  const configuredKey = process.env.DATA_ENCRYPTION_KEY;

  if (configuredKey) {
    return crypto.createHash('sha256').update(configuredKey).digest();
  }

  if (process.env.NODE_ENV !== 'production') {
    const developmentKey = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (developmentKey) {
      return crypto.createHash('sha256').update(developmentKey).digest();
    }
  }

  throw new Error('Configura DATA_ENCRYPTION_KEY para registrar datos de recepcion.');
};

export const validateClabe = (value) => {
  const clabe = normalizeDigits(value);
  if (clabe.length !== 18) return { valid: false, clabe };

  const factors = [3, 7, 1];
  const sum = clabe
    .slice(0, 17)
    .split('')
    .reduce((total, digit, index) => total + ((Number(digit) * factors[index % 3]) % 10), 0);
  const checkDigit = (10 - (sum % 10)) % 10;

  return { valid: checkDigit === Number(clabe[17]), clabe };
};

export const encryptDestination = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
};

export const maskDestination = (last4) => `**************${last4}`;
