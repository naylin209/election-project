const express = require('express');
const authService = require('../services/authService');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const sessionUser = await authService.login(email, password);

    res.json(sessionUser);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

module.exports = router;
