const session = require('express-session');
const bcrypt = require('bcryptjs');

function configureAdmin(app) {
  if (!process.env.SESSION_SECRET || !process.env.ADMIN_PASSWORD_HASH) {
    throw new Error('Configuration administrateur manquante dans .env');
  }

  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000
    }
  }));

  app.post('/api/admin/login', async (req, res) => {
    const password = req.body && req.body.password;
    const hash = process.env.ADMIN_PASSWORD_HASH;

    if (typeof password !== 'string' || password.length > 200) {
      return res.status(400).json({ error: 'Mot de passe invalide.' });
    }

    try {
      if (!(await bcrypt.compare(password, hash))) {
        return res.status(401).json({ error: 'Identifiants incorrects.' });
      }

      req.session.isAdmin = true;
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: 'Erreur de connexion.' });
    }
  });

  app.post('/api/admin/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  });

  app.get('/api/admin/me', (req, res) => {
    res.json({ authenticated: req.session.isAdmin === true });
  });

  app.requireAdmin = (req, res, next) => {
    if (req.session && req.session.isAdmin === true) return next();
    return res.status(401).json({ error: 'Connexion administrateur requise.' });
  };
}

module.exports = configureAdmin;
