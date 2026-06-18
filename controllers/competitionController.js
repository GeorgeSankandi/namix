import Competition from '../models/competitionModel.js';

export const getCompetitions = async (req, res) => {
    try {
        const comps = await Competition.find({}).sort({ createdAt: -1 });
        res.json(comps);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const createCompetition = async (req, res) => {
    try {
        const comp = new Competition(req.body);
        const created = await comp.save();
        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const submitCompetitionEntry = async (req, res) => {
    try {
        const comp = await Competition.findById(req.params.id);
        if (!comp) return res.status(404).json({ message: 'Competition not found' });

        const { userName, userEmail } = req.body;
        let proofOfPurchaseUrl = '';

        if (req.file) {
            proofOfPurchaseUrl = `/uploads/competitions/${req.file.filename}`;
        } else {
            return res.status(400).json({ message: 'Proof file is required' });
        }

        const mediaType = req.file.mimetype.includes('video') ? 'video' : 'image';

        comp.entries.push({
            userName,
            userEmail,
            proofOfPurchaseUrl,
            mediaType,
            status: 'Pending'
        });

        await comp.save();
        res.status(201).json({ message: 'Submitted', comp });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const declareWinner = async (req, res) => {
    try {
        const comp = await Competition.findById(req.params.id);
        if (!comp) return res.status(404).json({ message: 'Competition not found' });

        const { userName, prizeWon } = req.body;
        comp.winners.push({ userName, prizeWon, dateWon: new Date() });
        await comp.save();

        res.json({ message: 'Winner updated!', comp });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};