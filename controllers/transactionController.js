import Transaction from '../models/transactionModel.js';

const createTransaction = async (req, res) => {
    try {
        const {
            customerName,
            customerEmail,
            customerAddress,
            phoneNumber,
            landmark,
            locationRegion,
            transportMethod,
            deliveryFee,
            insuranceSelected,
            insuranceFee,
            items,
            totalAmount,
            giftCardEarned,
            paymentMethod,
        } = req.body;

        if (!customerName || !items || items.length === 0 || !totalAmount) {
            return res.status(400).json({ message: 'Missing required transaction fields' });
        }

        const transaction = new Transaction({
            customerName,
            customerEmail,
            customerAddress,
            phoneNumber: phoneNumber || 'N/A',
            landmark: landmark || '',
            locationRegion: locationRegion || 'N/A',
            transportMethod: transportMethod || 'Standard Delivery',
            deliveryFee: deliveryFee || 0,
            insuranceSelected: insuranceSelected || false,
            insuranceFee: insuranceFee || 0,
            items,
            totalAmount,
            giftCardEarned,
            paymentMethod,
        });

        const createdTransaction = await transaction.save();
        res.status(201).json(createdTransaction);

    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({}).sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (transaction) {
            transaction.verified = req.body.verified;

            const updatedTransaction = await transaction.save();
            res.json(updatedTransaction);
        } else {
            res.status(404).json({ message: 'Transaction not found' });
        }
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export { createTransaction, getAllTransactions, updateTransaction };
