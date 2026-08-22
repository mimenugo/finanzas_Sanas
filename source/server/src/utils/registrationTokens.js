import crypto from 'crypto';

export const createRegistrationToken = () => crypto.randomBytes(32).toString('base64url');

export const hashRegistrationToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const getRegistrationUrl = (req, token) => {
  const clientUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
  return `${clientUrl.replace(/\/$/, '')}/registro/${token}`;
};
