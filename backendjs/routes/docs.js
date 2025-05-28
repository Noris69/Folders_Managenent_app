const express = require('express');
const fs      = require('fs');
const path    = require('path');
const multer  = require('multer');
const protect = require('../middleware/auth');
const Document = require('../models/Document');
const mongoose = require('mongoose');
const User = require('../models/User');

const router = express.Router();

// --- Multer storage config ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(__dirname, '../uploads', req.user._id.toString());
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 Mo max
});

// POST /api/docs/upload
// champs multipart/form-data : 'files' pour les fichiers,
// metadata sous forme de champs textuels : author,category,folder,expirationDate,tags (JSON array ou CSV)
router.post(
  '/upload',
  protect,
  upload.array('files'),
  async (req, res) => {
    try {
      const { author, category, folder, expirationDate, tags } = req.body;
      // parse tags
      let tagsArr = [];
      if (tags) {
        try { tagsArr = JSON.parse(tags); }
        catch { tagsArr = tags.split(',').map(t => t.trim()); }
      }
      const docs = await Promise.all(
        req.files.map(file => Document.create({
          user:           req.user._id,
          name:           file.originalname,
          path:           path.relative(path.join(__dirname, '..'), file.path),
          size:           file.size,
          type:           file.mimetype,
          author,
          category,
          folder,
          expirationDate: expirationDate ? new Date(expirationDate) : undefined,
          tags:           tagsArr
        }))
      );
      res.status(201).json(docs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Erreur upload' });
    }
  }
);

// GET /api/docs
// liste les documents de l’utilisateur courant
router.get('/', protect, async (req, res) => {
    try {
      const filter = {
        $or: [
          { user: req.user._id },
          { sharedWith: req.user._id }
        ]
      };
      // filtre facultatif par dossier
      if (req.query.folder && req.query.folder !== 'null') {
        filter.folder = req.query.folder;
      } else if (req.query.folder === 'null') {
        filter.folder = { $exists: false };
      }
      const docs = await Document.find(filter).sort({ uploadDate: -1 });
      res.json(docs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });
  
  // → SHARE : partager un doc avec un user identifié par email
  router.post('/:id/share', protect, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email requis' });
  
    try {
      // 1) destinataire
      const target = await User.findOne({ email });
      if (!target) return res.status(404).json({ message: 'Utilisateur introuvable' });
  
      // 2) doc
      if (!mongoose.Types.ObjectId.isValid(req.params.id))
        return res.status(400).json({ message: 'ID invalide' });
  
      const doc = await Document.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: 'Document non trouvé' });
  
      // 3) vérif ownership
      if (!doc.user.equals(req.user._id))
        return res.status(403).json({ message: 'Accès interdit' });
  
      // 4) push sans doublon
      if (!doc.sharedWith.includes(target._id)) {
        doc.sharedWith.push(target._id);
        await doc.save();
      }
  
      res.json({ message: `Partagé avec ${email}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Erreur partage' });
    }
  });

// GET /api/docs/:id/download
// télécharge le fichier
router.get('/:id/download', protect, async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Document non trouvé' });
  if (!doc.user.equals(req.user._id))
    return res.status(403).json({ message: 'Accès interdit' });

  const filePath = path.join(__dirname, '..', doc.path);
  res.download(filePath, doc.name);
});

// PUT /api/docs/:id
router.put('/:id', protect, async (req, res) => {
    const { author, category, folder, expirationDate, tags } = req.body;
    const { id } = req.params;
  
    // 1) validate ID
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'ID invalide' });
  
    // 2) find & ownership
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ message: 'Document non trouvé' });
    if (!doc.user.equals(req.user._id))
      return res.status(403).json({ message: 'Accès interdit' });
  
    // 3) apply updates
    doc.author         = author;
    doc.category       = category;
    doc.folder         = folder;
    doc.expirationDate = expirationDate ? new Date(expirationDate) : undefined;
    doc.tags           = Array.isArray(tags) ? tags : [];
  
    // 4) save & return
    await doc.save();
    res.json(doc);
  });
  
module.exports = router;
