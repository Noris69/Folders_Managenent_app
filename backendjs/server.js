// server.js (extraits autour des routes)
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const dotenv       = require('dotenv');
const connectDB    = require('./config/db');
const cookieParser = require('cookie-parser');
const path         = require('path');

dotenv.config();
connectDB();

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'self'"] },
    },
  })
);

// ** tes routes existantes **
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/docs', require('./routes/docs'));


// ** nouvelle route dossiers **
app.use('/api/folders', require('./routes/folders'));

// servir uploads, 404, 500…
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use((req, res) => res.status(404).json({ message: 'Route inconnue' }));
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur interne' });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
