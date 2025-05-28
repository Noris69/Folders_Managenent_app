const jwt  = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req,res,next){
  const header = req.headers.authorization;
  if(!header || !header.startsWith('Bearer '))
    return res.status(401).json({message:'Non autorisé'});

  const token = header.split(' ')[1];
  try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  }catch(err){
    return res.status(401).json({message:'Token invalide'});
  }
}
module.exports = protect;
