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
        isAdmin: user.isAdmin,
        sellerType: user.sellerType || 'customer',
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
  const { name, email, password, sellerType, sellerIdNumber, businessRegistrationNumber, physicalAddress } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let userSellerType = 'customer';
    let isApproved = true;

    // Permit registration routing for streamlined reseller roles
    if (['electronics', 'solar', 'fashion', 'groceries', 'appliances', 'vehicles', 'crafts', 'farm', 'fuel', 'other'].includes(sellerType)) {
      userSellerType = sellerType;
      isApproved = false;
      if (!physicalAddress) {
        return res.status(400).json({ message: 'Physical address is required for reseller signup.' });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      sellerType: userSellerType,
      isApproved,
      isVerified: false,
      sellerIdNumber: sellerIdNumber || '',
      businessRegistrationNumber: businessRegistrationNumber || '',
      businessRegistrationDocument: req.body.businessRegistrationDocument || '',
      physicalAddress: physicalAddress || ''
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        sellerType: user.sellerType,
        isApproved: user.isApproved,
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

        const { isApproved } = req.body;
        if (typeof isApproved !== 'boolean') {
             return res.status(400).json({ message: 'A boolean `isApproved` status is required.' });
        }

        user.isApproved = isApproved;
        await user.save();

        const message = isApproved ? 'User approved successfully' : 'User account has been deactivated.';
        res.json({ message, user });
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

export { authUser, registerUser, getUsers, deleteUser, approveUser, getUserBalance };