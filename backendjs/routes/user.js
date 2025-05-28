const express = require('express');
const protect = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/user/me
 * @desc    Profil de l’utilisateur connecté
 */
router.get('/me', protect, (req, res) => {
  res.json(req.user); // req.user injecté par le middleware
});

module.exports = router;
