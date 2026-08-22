import jwt from 'jsonwebtoken';

const accessSecret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const refreshSecret = () => process.env.JWT_REFRESH_SECRET;
const accessExpiry = () => process.env.ACCESS_TOKEN_EXPIRY || '15m';
const refreshExpiry = () => process.env.REFRESH_TOKEN_EXPIRY || '7d';

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, accessSecret(), { expiresIn: accessExpiry() });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, refreshSecret(), { expiresIn: refreshExpiry() });
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, accessSecret());
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, refreshSecret());
  } catch (error) {
    return null;
  }
};
