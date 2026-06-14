import FAQ from '../models/faqModel.js';

// @desc    Get all FAQs
// @route   GET /api/faqs
const getFAQs = async (req, res) => {
    try {
        const faqs = await FAQ.find({});
        res.json(faqs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create an FAQ
// @route   POST /api/faqs
const createFAQ = async (req, res) => {
    try {
        const { question, answer } = req.body;
        if (!question || !answer) {
            return res.status(400).json({ message: 'Question and answer are required' });
        }
        const faq = new FAQ({ question, answer });
        const createdFAQ = await faq.save();
        res.status(201).json(createdFAQ);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update an FAQ
// @route   PUT /api/faqs/:id
const updateFAQ = async (req, res) => {
    try {
        const { question, answer } = req.body;
        const faq = await FAQ.findById(req.params.id);

        if (faq) {
            faq.question = question || faq.question;
            faq.answer = answer || faq.answer;
            const updatedFAQ = await faq.save();
            res.json(updatedFAQ);
        } else {
            res.status(404).json({ message: 'FAQ not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete an FAQ
// @route   DELETE /api/faqs/:id
const deleteFAQ = async (req, res) => {
    try {
        const faq = await FAQ.findByIdAndDelete(req.params.id);
        if (!faq) {
            return res.status(404).json({ message: 'FAQ not found' });
        }
        res.json({ message: 'FAQ removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export { getFAQs, createFAQ, updateFAQ, deleteFAQ };