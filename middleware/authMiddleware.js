import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

// Middleware to protect routes
const protect = async (req, res, next) => {
  console.log('\n=== PROTECT MIDDLEWARE ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('req.user:', req.user ? { id: req.user._id, email: req.user.email, isAdmin: req.user.isAdmin } : null);
  console.log('req.session.passport:', req.session?.passport?.user ? `User ID: ${req.session.passport.user}` : null);
  console.log('Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
  
  // If Passport has already attached a user via session, allow it.
  if (req.user) {
    console.log('✓ Authentication: req.user found');
    return next();
  }
  
  // Check if user is authenticated via Passport session
  if (req.session && req.session.passport && req.session.passport.user) {
    console.log('✓ Authentication: session.passport.user found, deserializing...');
    try {
      // Manually deserialize the user from session
      req.user = await User.findById(req.session.passport.user).select('-password');
      console.log('✓ User deserialized:', req.user.email);
      return next();
    } catch (error) {
      console.error('✗ Error deserializing user from session:', error);
      return res.status(401).json({ message: 'Not authorized, session error' });
    }
  }

  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    console.log('✓ Authentication: Bearer token found, verifying...');
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      
      // Get secrets: primary (from env) and fallback used previously
      const primarySecret = process.env.JWT_SECRET;
      const fallbackSecret = 'dev_fallback_secret_change_me';

      // Attempt verification first with the primary secret (if available),
      // then fall back to the legacy development secret to tolerate old tokens.
      let decoded;
      if (primarySecret) {
        try {
          decoded = jwt.verify(token, primarySecret);
        } catch (err) {
          // If signature invalid with primary, try fallback before failing
          try {
            decoded = jwt.verify(token, fallbackSecret);
            console.warn('Token verified using fallback secret (legacy token).');
          } catch (err2) {
            throw err2;
          }
        }
      } else {
        // No primary secret configured — verify with fallback (dev) secret
        decoded = jwt.verify(token, fallbackSecret);
        console.warn('No JWT_SECRET configured; verified token with fallback secret.');
      }

      // Get user from the token (excluding the password)
      req.user = await User.findById(decoded.id).select('-password');
      console.log('✓ Token verified, user found:', req.user.email);

      return next();
    } catch (error) {
      console.error('✗ Token verification failed:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // No session and no token found
  console.log('✗ No authentication found');
  res.status(401).json({ message: 'Not authorized, no authentication' });
};

// Middleware to grant access to admin users
const admin = (req, res, next) => {
  // Allow access to main admins or seller accounts (sellerType != 'customer')
  if (req.user) {
    const isMainAdmin = req.user.isAdmin === true;
    const isSeller = !!(req.user.sellerType && req.user.sellerType !== 'customer');
    if (isMainAdmin || isSeller) {
      return next();
    }
  }
  console.warn('Admin access denied for user:', req.user ? { id: req.user._id, isAdmin: req.user.isAdmin, sellerType: req.user.sellerType } : null);
  res.status(401).json({ message: 'Not authorized as an admin' });
};

export { protect, admin };