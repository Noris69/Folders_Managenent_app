const mongoose = require('mongoose');
const argon2 = require('argon2');

const PEPPER           = process.env.PEPPER;
const MAX_ATTEMPTS     = 5;
const LOCK_WINDOW      = (parseInt(process.env.LOCK_WINDOW_MINUTES, 10) || 15) * 60 * 1000;

const userSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  email:          { type: String, required: true, unique: true, lowercase: true, match:/^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password:       { type: String, required: true, minlength: 8, select:false },
  role:           { type: String, enum:['USER','ADMIN'], default:'USER' },

  // MFA
  mfaEnabled:     { type: Boolean, default: false },
  mfaSecret:      { type: String },

  // Brute-force
  failedAttempts: { type: Number, default: 0 },
  lockUntil:      { type: Date },
}, {timestamps:true});

/* hachage argon2id + pepper */
userSchema.pre('save', async function(next){
  if(!this.isModified('password')) return next();
  this.password = await argon2.hash(this.password+PEPPER,{
    type: argon2.argon2id, memoryCost: 2**16, timeCost: 3, parallelism: 1
  });
  next();
});

/* méthodes (inchangées sauf export) */
userSchema.methods = {
  isLocked()          { return this.lockUntil && this.lockUntil > Date.now(); },
  matchPassword(raw)  { return argon2.verify(this.password, raw+PEPPER); },
  async incrementFailed() { this.failedAttempts++; if(this.failedAttempts>=MAX_ATTEMPTS){ this.lockUntil = new Date(Date.now()+LOCK_WINDOW);} await this.save({validateBeforeSave:false}); },
  async resetAttempts()   { this.failedAttempts=0; this.lockUntil=undefined; await this.save({validateBeforeSave:false}); }
};

module.exports = mongoose.model('User', userSchema);
