import Setting from '../models/settingsModel.js';

// @desc    Get all settings
// @route   GET /api/settings
const getSettings = async (req, res) => {
    try {
        const settings = await Setting.find({});
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a setting (upsert)
// @route   PUT /api/settings
const updateSetting = async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key || value === undefined) {
            return res.status(400).json({ message: 'Key and value are required' });
        }

        const updatedSetting = await Setting.findOneAndUpdate(
            { key },
            { value },
            { new: true, upsert: true, runValidators: true }
        );
        
        res.json(updatedSetting);

    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export { getSettings, updateSetting };