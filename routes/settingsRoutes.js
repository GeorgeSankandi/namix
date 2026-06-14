import express from 'express';
const router = express.Router();
import { getSettings, updateSetting } from '../controllers/settingsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

router.route('/').get(getSettings).put(protect, admin, updateSetting);

export default router;
