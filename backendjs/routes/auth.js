const express    = require('express');
const jwt        = require('jsonwebtoken');
const rateLimit  = require('express-rate-limit');
const validator  = require('validator');
const zxcvbn     = require('zxcvbn');
const speakeasy  = require('speakeasy');
const qrcode     = require('qrcode');
const { v4:uuid} = require('uuid');

const User        = require('../models/User');
const Refresh     = require('../models/RefreshToken');

const router = express.Router();

/* -- limiteurs -- */
const registerLimiter = rateLimit({windowMs:15*60e3, max:30, standardHeaders:true});
const loginLimiter    = rateLimit({windowMs:15*60e3, max:50, standardHeaders:true});

/* -- helpers JWT -- */
function signAccess(id){
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });
}
function signRefresh(id, sid){
  return jwt.sign({ id, sid }, process.env.JWT_SECRET, { expiresIn: process.env.REFRESH_EXPIRES });
}

/* ---------- REGISTER ---------- */
router.post('/register', registerLimiter, async (req, res) => {
    const { name, email, password } = req.body;
  
    // validations existantes…
    if (!validator.isEmail(email))      return res.status(400).json({ message:'Email invalide' });
    if (zxcvbn(password).score < 3)     return res.status(400).json({ message:'Mot de passe trop faible' });
    if (await User.findOne({ email }))  return res.status(400).json({ message:'Email déjà utilisé' });
  
    try {
      // 1) Créer l'utilisateur (hachage, attempts, etc.)
      const user = await User.create({ name, email, password });
  
      // 2) Générer et stocker le secret MFA
      const secret = speakeasy.generateSecret({
        name: `${process.env.ISSUER_NAME || 'MyApp'} (${email})`
      });
      user.mfaSecret  = secret.base32;
      user.mfaEnabled = true; // on active plus tard dans /mfa/verify
      await user.save({ validateBeforeSave:false });
  
      // 3) Générer le QR-code
      const qr = await qrcode.toDataURL(secret.otpauth_url);
  
      // 4) Créer tokens et cookie refresh
      const access  = signAccess(user._id);
      const sid     = uuid();
      const refresh = signRefresh(user._id, sid);
      await Refresh.create({
        sid,
        user: user._id,
        expiresAt: new Date(Date.now() + 7*24*60*60*1000)
      });
      res.cookie('refresh', refresh, {
        httpOnly: true, sameSite: 'strict', secure: true, maxAge: 7*24*60*60*1000
      });
  
      // 5) Retourner access + qr + secret
      return res.status(201).json({
        access,
        qr,              // data:image/png;base64,...
        mfaSecret: secret.base32
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message:'Erreur serveur' });
    }
  });

/* ---------- LOGIN ---------- */
router.post('/login', loginLimiter, async (req,res)=>{
  const {email,password,totp}=req.body;

  try{
    const user = await User.findOne({email}).select('+password +mfaSecret +mfaEnabled');
    if(!user) return res.status(401).json({message:'Identifiants invalides'});
    if(user.isLocked()) return res.status(423).json({message:'Compte verrouillé, réessayez plus tard.'});
    if(!(await user.matchPassword(password))){
      await user.incrementFailed();
      return res.status(401).json({message:'Identifiants invalides'});
    }

    /* MFA requis ? */
    if(user.mfaEnabled){
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding:'base32',
        token: totp,
        window:1
      });
      if(!verified){
        await user.incrementFailed();
        return res.status(401).json({message:'Code MFA invalide'});
      }
    }

    await user.resetAttempts();
    const access = signAccess(user._id);
    const sid    = uuid();
    const refresh= signRefresh(user._id, sid);
    await Refresh.create({ sid, user:user._id, expiresAt:new Date(Date.now()+7*24*60*60*1000) });

    res.cookie('refresh', refresh, { httpOnly:true, sameSite:'strict', secure:true, maxAge:7*24*60*60*1000 });
    return res.json({ access });
  }catch(err){
    console.error(err); return res.status(500).json({message:'Erreur serveur'});
  }
});

/* ---------- MFA setup (authentifié) ---------- */
const protect = require('../middleware/auth'); // inchangé

router.get('/mfa/setup', protect, async (req,res)=>{
  const user = await User.findById(req.user._id);
  if(user.mfaEnabled) return res.status(400).json({message:'MFA déjà activée'});

  const secret = speakeasy.generateSecret({ name:`${process.env.ISSUER_NAME} (${user.email})` });
  user.mfaSecret = secret.base32;
  await user.save({validateBeforeSave:false});

  const qr = await qrcode.toDataURL(secret.otpauth_url);
  return res.json({ qr, secret:secret.base32 });
});

/* ---------- MFA verify & enable ---------- */
router.post('/mfa/verify', protect, async (req,res)=>{
  const { token } = req.body;
  const user = await User.findById(req.user._id).select('+mfaSecret');
  if(user.mfaEnabled) return res.status(400).json({message:'MFA déjà activée'});

  const ok = speakeasy.totp.verify({ secret:user.mfaSecret, encoding:'base32', token, window:1 });
  if(!ok) return res.status(400).json({message:'Code MFA invalide'});

  user.mfaEnabled = true;
  await user.save({validateBeforeSave:false});
  return res.json({ message:'MFA activée' });
});

/* ---------- Refresh token rotation ---------- */
router.post('/token/refresh', async (req,res)=>{
  const { refresh:refreshCookie } = req.cookies;
  if(!refreshCookie) return res.status(401).json({message:'Pas de refresh token'});

  try{
    const payload = jwt.verify(refreshCookie, process.env.JWT_SECRET);
    const session = await Refresh.findOne({ sid:payload.sid, revoked:false });
    if(!session) throw new Error('Session invalide');

    // token encore valide ? (exp check déjà fait par verify)
    // Rotation : révoquer l'ancien et en créer un nouveau
    session.revoked = true;
    await session.save();

    const newSid = uuid();
    await Refresh.create({ sid:newSid, user:payload.id, expiresAt:new Date(Date.now()+7*24*60*60*1000) });

    const newRefresh = signRefresh(payload.id, newSid);
    const newAccess  = signAccess(payload.id);

    res.cookie('refresh', newRefresh, { httpOnly:true, sameSite:'strict', secure:true, maxAge:7*24*60*60*1000 });
    return res.json({ access:newAccess });
  }catch(err){
    console.error(err); return res.status(401).json({message:'Refresh token invalide'});
  }
});

/* ---------- Logout ---------- */
router.post('/logout', protect, async (req,res)=>{
  const { refresh:refreshCookie } = req.cookies;
  if(refreshCookie){
    try{
      const { sid } = jwt.verify(refreshCookie, process.env.JWT_SECRET);
      await Refresh.findOneAndUpdate({ sid }, { revoked:true });
    }catch(_){}
  }
  res.clearCookie('refresh');
  return res.json({ message:'Déconnecté' });
});

module.exports = router;
