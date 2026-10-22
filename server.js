const express = require('express');
const path = require('path');
const fs = require('fs');
const configureAdmin = require('./admin-auth');
require('dotenv').config();

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'links.json');

function readLinks() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveLinks(links) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(links, null, 2));
}

if (!fs.existsSync(DATA_FILE)) saveLinks([]);

app.use(express.json());
configureAdmin(app);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (req, res) => {
  res.json({ online: true, site: 'DEV KENTO AMATRIX' });
});

app.get('/api/links', (req, res) => {
  const { category } = req.query;
  const links = readLinks();
  res.json(category ? links.filter(link => link.category === category) : links);
});

app.post('/api/links', (req, res, next) => {
  if (!req.session || req.session.isAdmin !== true) return res.status(401).json({ error: 'Connexion administrateur requise.' });
  const { category, name, url } = req.body || {};

  if (![category, name, url].every(v => typeof v === 'string' && v.trim())) {
    return res.status(400).json({ error: 'Catégorie, nom et lien obligatoires.' });
  }

  try {
    const parsed = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  } catch {
    return res.status(400).json({ error: 'Adresse invalide : utilise un lien http ou https.' });
  }

  const links = readLinks();
  const link = {
    id: Date.now().toString(),
    category: category.trim(),
    name: name.trim(),
    url: url.trim()
  };

  links.push(link);

  try {
    saveLinks(links);
    res.status(201).json(link);
  } catch {
    res.status(500).json({ error: 'Impossible de sauvegarder le lien.' });
  }
});

app.delete('/api/links/:id', (req, res, next) => {
  if (!req.session || req.session.isAdmin !== true) return res.status(401).json({ error: 'Connexion administrateur requise.' });
  const links = readLinks();
  const updated = links.filter(link => link.id !== req.params.id);

  if (updated.length === links.length) {
    return res.status(404).json({ error: 'Lien introuvable.' });
  }

  try {
    saveLinks(updated);
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: 'Impossible de supprimer le lien.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Serveur démarré sur le port ' + PORT);
});
