const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const documentSchema = new Schema({
  user:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:           { type: String, required: true },
  path:           { type: String, required: true },
  size:           { type: Number, required: true },
  type:           { type: String, required: true },
  uploadDate:     { type: Date,   default: Date.now },
  author:         { type: String },
  category:       { type: String },
  folder:         { type: String },
  expirationDate: { type: Date },
  tags:           { type: [String], default: [] },

  // ---- nouveau champ pour le partage ----
  sharedWith:     [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

module.exports = mongoose.model('Document', documentSchema);
