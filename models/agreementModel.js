import mongoose from 'mongoose';

const agreementSchema = mongoose.Schema({
    roomId: { type: String, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    agreedPrice: { type: Number, required: true },
    deposit: { type: Number, default: 0 },
    tradeItem: { type: String, default: '' },
    tradeValue: { type: Number, default: 0 },
    deliveryDate: { type: Date },
    transportMethod: { type: String, default: 'Standard' },
    notes: { type: String, default: '' },
    isSaved: { type: Boolean, default: true }
}, {
    timestamps: true
});

const Agreement = mongoose.model('Agreement', agreementSchema);
export default Agreement;