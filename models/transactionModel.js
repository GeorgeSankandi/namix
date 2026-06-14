import mongoose from 'mongoose';

const transactionSchema = mongoose.Schema({
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerAddress: { type: String, required: true },
    items: [{
        productId: { type: String, required: true },
        title: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        selectedColor: { type: String, default: null },
    }],
    totalAmount: { type: Number, required: true },
    giftCardEarned: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['eft', 'ewallet', 'layby', 'tradein'], required: true },
}, {
    timestamps: true,
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;