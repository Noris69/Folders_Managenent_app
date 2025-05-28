// models/Folder.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const folderSchema = new Schema({
  user:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:   { type: String, required: true, trim: true },
  parent: { type: Schema.Types.ObjectId, ref: 'Folder' }, // pour future hiérarchie
}, { timestamps: true });

module.exports = mongoose.model('Folder', folderSchema);
