import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'dev_fallback_secret_change_me';
  if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not set. Using a development fallback secret. Do NOT use this in production.');
  }
  return jwt.sign({ id }, secret, {
    expiresIn: '30d',
  });
};

export default generateToken;
