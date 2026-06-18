import mongoose from 'mongoose';

const competitionEntrySchema = mongoose.Schema({
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },
    proofOfPurchaseUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }
}, {
    timestamps: true
});

const competitionSchema = mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    prizeDetails: { type: String, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    entries: [competitionEntrySchema],
    winners: [{
        userName: { type: String, required: true },
        prizeWon: { type: String, required: true },
        dateWon: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

const Competition = mongoose.model('Competition', competitionSchema);
export default Competition;