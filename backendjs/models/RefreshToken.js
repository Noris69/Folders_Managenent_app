const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  sid:        { type:String, required:true, unique:true }, // UUID
  user:       { type: mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  expiresAt:  { type: Date, required:true },
  revoked:    { type: Boolean, default:false },
}, {timestamps:true});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
