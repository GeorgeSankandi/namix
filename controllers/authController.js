import crypto from 'crypto';
import User from '../models/userModel.js';

const validatePassword = (password) => {
  const minLength = 8;
  const minCapitalLetters = 1;
  const minNumbers = 2;
  
  if (password.length < minLength) {
    return {
      valid: false,
      message: `Password must contain at least ${minLength} characters.`
    };
  }
  
  const capitalLetterCount = (password.match(/[A-Z]/g) || []).length;
  if (capitalLetterCount < minCapitalLetters) {
    return {
      valid: false,
      message: `Password must contain at least ${minCapitalLetters} capital letter(s).`
    };
  }
  
  const numberCount = (password.match(/[0-9]/g) || []).length;
  if (numberCount < minNumbers) {
    return {
      valid: false,
      message: `Password must contain at least ${minNumbers} number(s).`
    };
  }
  
  return { valid: true };
};

const signup = async (req, res) => {
  const { name, email, password, sellerType, sellerIdNumber, businessRegistrationNumber, physicalAddress } = req.body;
  
  try {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    let userSellerType = 'customer';
    let isApproved = true;

    // Permit vehicles, property, food, and books seller types under approved verification checks
    if (['electronics', 'solar', 'fashion', 'groceries', 'appliances', 'vehicles', 'crafts', 'farm', 'fuel', 'other'].includes(sellerType)) {
      userSellerType = sellerType;
      isApproved = false; // Resellers require administrative verification
      if (!physicalAddress) {
        return res.status(400).json({ message: 'Physical address is required for reseller signup.' });
      }
      if (!req.file) {
        return res.status(400).json({ message: 'Business registration document (PDF, max 25MB) is required for reseller signup.' });
      }
    }

    const user = await User.create({ 
      name, 
      email, 
      password,
      sellerType: userSellerType,
      isApproved: isApproved,
      isVerified: false,
      sellerIdNumber: sellerIdNumber || '',
      businessRegistrationNumber: businessRegistrationNumber || '',
      businessRegistrationDocument: req.file ? `/uploads/reseller-documents/${req.file.filename}` : '',
      physicalAddress: physicalAddress || ''
    });

    if (!isApproved) {
      return res.json({ 
        message: 'Signup successful. Your reseller account is pending approval by an admin.',
        user: null,
        pendingApproval: true
      });
    }

    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: 'Signup error' });
      return res.json({ message: 'Signed up', user: { _id: user._id, name: user.name, email: user.email, sellerType: user.sellerType } });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ message: 'If that email exists, a reset link was sent.' });
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();
    console.log(`Password reset token for ${email}: ${token}`);
    res.json({ message: 'Reset token generated', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export { signup, logout, forgotPassword, resetPassword };