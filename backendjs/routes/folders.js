// routes/folders.js
const express = require('express');
const mongoose = require('mongoose');
const protect = require('../middleware/auth');
const Folder  = require('../models/Folder');

const router = express.Router();

// GET /api/folders
// Liste tous les dossiers de l’utilisateur connecté
router.get('/', protect, async (req, res) => {
  try {
    const folders = await Folder.find({ user: req.user._id }).sort({ createdAt: 1 });
    res.json(folders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/folders
// Crée un nouveau dossier { name, parent? }
router.post('/', protect, async (req, res) => {
  const { name, parent } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Nom du dossier requis' });
  }
  try {
    // si parent fourni, vérifier sa validité et appartenance
    let parentFolder = null;
    if (parent) {
      if (!mongoose.Types.ObjectId.isValid(parent)) {
        return res.status(400).json({ message: 'ID de parent invalide' });
      }
      parentFolder = await Folder.findById(parent);
      if (!parentFolder || !parentFolder.user.equals(req.user._id)) {
        return res.status(403).json({ message: 'Parent non autorisé' });
      }
    }

    const folder = await Folder.create({
      user: req.user._id,
      name: name.trim(),
      parent: parentFolder ? parentFolder._id : undefined,
    });
    res.status(201).json(folder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur création dossier' });
  }
});

module.exports = router;
