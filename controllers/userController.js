import User from '../models/userModel.js';
import Transaction from '../models/transactionModel.js';
import generateToken from '../utils/generateToken.js';

const authUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      
      if (user.isApproved === false) {
         return res.status(401).json({ message: 'Account pending approval' });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName || '',
        phone: user.phone || '',
        profileImage: user.profileImage || '',
        defaultWarranty: user.defaultWarranty || '1-Year Warranty',
        defaultDeliveryOption: user.defaultDeliveryOption || 'Delivery Nationwide',
        isAdmin: user.isAdmin,
        sellerType: user.sellerType || 'customer',
        isVerified: user.isVerified || false,
        showBestSellerBadge: user.showBestSellerBadge || false,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
      res.status(500).json({ message: 'Server Error' });
  }
};

const registerUser = async (req, res) => {
  const { name, email, password, sellerType, sellerIdNumber, businessRegistrationNumber, physicalAddress, businessName, phone } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let userSellerType = 'customer';
    let isApproved = true;
    let isVerified = false;

    const selectedTypes = (sellerType || '').split(',').map(t => t.trim());
    const validSellerTypes = ['electronics', 'solar', 'fashion', 'groceries', 'appliances', 'vehicles', 'crafts', 'farm', 'fuel', 'other'];
    const hasSellerSelection = selectedTypes.some(type => validSellerTypes.includes(type));

    if (hasSellerSelection) {
      userSellerType = sellerType;
      isApproved = false;
      if (!physicalAddress) {
        return res.status(400).json({ message: 'Physical address is required for reseller signup.' });
      }
      isVerified = true; 
    }

    const user = await User.create({
      name,
      email,
      password,
      sellerType: userSellerType,
      isApproved,
      isVerified,
      sellerIdNumber: sellerIdNumber || '',
      businessRegistrationNumber: businessRegistrationNumber || '',
      businessRegistrationDocument: req.body.businessRegistrationDocument || '',
      physicalAddress: physicalAddress || '',
      businessName: businessName || '',
      phone: phone || '',
      defaultWarranty: '1-Year Warranty',
      defaultDeliveryOption: 'Delivery Nationwide'
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        phone: user.phone,
        profileImage: user.profileImage || '',
        defaultWarranty: user.defaultWarranty,
        defaultDeliveryOption: user.defaultDeliveryOption,
        isAdmin: user.isAdmin,
        sellerType: user.sellerType,
        isApproved: user.isApproved,
        isVerified: user.isVerified,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
      res.status(500).json({ message: 'Server Error' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.isAdmin || user.sellerType === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin accounts' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const approveUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { isApproved, showBestSellerBadge, isVerified } = req.body;
        if (isApproved !== undefined) user.isApproved = isApproved;
        if (showBestSellerBadge !== undefined) user.showBestSellerBadge = showBestSellerBadge;
        if (isVerified !== undefined) user.isVerified = isVerified;

        await user.save();
        res.json({ message: 'Status updated successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getUserBalance = async (req, res) => {
    try {
        if (!req.user || !req.user.email) {
             return res.status(401).json({ message: 'Not authorized' });
        }

        const transactions = await Transaction.find({ customerEmail: req.user.email });
        const balance = transactions.reduce((acc, txn) => acc + (txn.giftCardEarned || 0), 0);
        
        res.json({ balance });
    } catch (error) {
        console.error('Error fetching balance:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = req.body.name || user.name;
    user.businessName = req.body.businessName !== undefined ? req.body.businessName : user.businessName;
    user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
    user.defaultWarranty = req.body.defaultWarranty || user.defaultWarranty;
    user.defaultDeliveryOption = req.body.defaultDeliveryOption || user.defaultDeliveryOption;
    user.physicalAddress = req.body.physicalAddress !== undefined ? req.body.physicalAddress : user.physicalAddress;

    if (req.body.latitude !== undefined && req.body.latitude !== '') {
      user.latitude = Number(req.body.latitude);
    }
    if (req.body.longitude !== undefined && req.body.longitude !== '') {
      user.longitude = Number(req.body.longitude);
    }

    if (req.body.pickupPoints) {
      try {
        user.pickupPoints = JSON.parse(req.body.pickupPoints);
      } catch (e) {
        console.error('Error parsing pickup points', e);
      }
    }

    if (req.file) {
      user.profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      businessName: updatedUser.businessName,
      phone: updatedUser.phone,
      profileImage: updatedUser.profileImage,
      defaultWarranty: updatedUser.defaultWarranty,
      defaultDeliveryOption: updatedUser.defaultDeliveryOption,
      physicalAddress: updatedUser.physicalAddress,
      latitude: updatedUser.latitude,
      longitude: updatedUser.longitude,
      pickupPoints: updatedUser.pickupPoints,
      isAdmin: updatedUser.isAdmin,
      sellerType: updatedUser.sellerType,
      isVerified: updatedUser.isVerified,
      showBestSellerBadge: updatedUser.showBestSellerBadge,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export { authUser, registerUser, getUsers, deleteUser, approveUser, getUserBalance, updateUserProfile };