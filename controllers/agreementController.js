import Agreement from '../models/agreementModel.js';

export const saveAgreement = async (req, res) => {
    try {
        const { roomId, sellerId, buyerId, agreedPrice, deposit, tradeItem, tradeValue, deliveryDate, transportMethod, notes } = req.body;
        
        const agreement = new Agreement({
            roomId,
            sellerId,
            buyerId,
            agreedPrice,
            deposit,
            tradeItem,
            tradeValue,
            deliveryDate,
            transportMethod,
            notes,
            isSaved: true
        });

        const created = await agreement.save();
        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getRoomAgreements = async (req, res) => {
    try {
        const agreements = await Agreement.find({ roomId: req.params.roomId })
            .populate('sellerId', 'name businessName')
            .populate('buyerId', 'name');
        res.json(agreements);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};