# ✅ Checklist de Déploiement - Netlify + Twilio + Supabase

Avant de déployer votre application en production, vérifiez tous les éléments de cette checklist.

---

## 🔧 Côté Code - Vérifications

### Structure du projet
- [ ] `server/index.ts` - Endpoints Express configurés
- [ ] `server/node-build.ts` - Exporte `handler` pour serverless
- [ ] `vite.config.server.ts` - Génère `dist/server/node-build.mjs`
- [ ] `netlify.toml` - Redirection API activée
- [ ] `package.json` - Contient `serverless-http` et `@supabase/supabase-js`

### Build local
```bash
# Vérifier que le build réussit
npm run build

# Vérifier qu'il n'y a pas d'erreurs TypeScript
npm run typecheck

# ✅ Expected output:
# dist/spa/     (Frontend assets)
# dist/server/node-build.mjs  (Serverless function)
```

### Tests locaux
```bash
# Lancer le serveur local
npm run dev

# Vérifier les endpoints
curl http://localhost:5173/api/ping
# Should return: {"message":"ping pong"}

# Vérifier que le formulaire fonctionne
# 1. Aller à http://localhost:5173/register
# 2. Remplir le formulaire
# 3. Soumettre et vérifier que l'API répond
```

---

## 📋 Checklist Supabase

### Projet Supabase
- [ ] Compte créé sur https://supabase.com
- [ ] Projet créé dans Supabase
- [ ] Tables créées:
  - [ ] `users` (stocke les inscriptions)
  - [ ] `sessions` (sessions de formation)
  - [ ] `reports` (rapports)
  - [ ] `ideas` (boîte à idées)
  - [ ] `patrols` (dories/patrouilles)
  - [ ] `roles` (rôles des utilisateurs)

### Clés d'API Supabase
- [ ] Récupérer `VITE_SUPABASE_URL` depuis Settings > API > URL
- [ ] Récupérer `VITE_SUPABASE_ANON_KEY` depuis Settings > API > anon key
- [ ] Récupérer `SUPABASE_SERVICE_ROLE_KEY` depuis Settings > API > service_role key
  - ⚠️ Garder SECRET - jamais commiter!

### Test de connexion local
```bash
# Vérifier que les variables d'environnement sont chargées
# Le .env.local doit contenir:
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Test avec curl:
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "generated_id": "E0001",
    "password": "test1234"
  }'

# ✅ Expected: 200 ou 401 (pas 500)
```

---

## 📱 Checklist Twilio

### Compte Twilio
- [ ] Créer compte sur https://www.twilio.com/console
- [ ] Aller à Settings > General > Account SID (copier)
- [ ] Aller à Settings > Auth > Auth Token (copier) ⚠️ SECRET
- [ ] Ajouter un numéro de téléphone ou utiliser le sandbox WhatsApp

### Configuration WhatsApp
- [ ] Aller à Messaging > Phone Numbers
- [ ] Ajouter un numéro (ou utiliser sandbox)
- [ ] Activer WhatsApp sur ce numéro
- [ ] Obtenir le numéro au format `whatsapp:+1234567890`

### Clés Twilio
- [ ] Récupérer `TWILIO_ACCOUNT_SID`
- [ ] Récupérer `TWILIO_AUTH_TOKEN` ⚠️ TRÈS SECRET
- [ ] Défini `TWILIO_PHONE_NUMBER=whatsapp:+1234567890`
- [ ] Défini `ADMIN_WHATSAPP=whatsapp:+212612345678` (votre numéro admin)

### Test local WhatsApp
```bash
# Vérifier que les variables Twilio sont chargées dans .env.local
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=whatsapp:+1234567890
ADMIN_WHATSAPP=whatsapp:+212612345678

# Test avec curl:
curl -X POST http://localhost:3000/api/whatsapp/send-registration \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "firstName": "Test",
      "lastName": "User",
      "userPhone": "+212612345678"
    }
  }'

# ✅ Expected: 200 (pas 500 avec "Twilio configuration missing")
# Vérifier que le message WhatsApp est reçu sur ADMIN_WHATSAPP
```

---

## 🚀 Checklist Netlify

### Préparer le repository
- [ ] Cloner/pusher le code sur GitHub
- [ ] `.env.local` n'est PAS commité (vérifier .gitignore)
- [ ] Tous les fichiers sensibles sont dans .gitignore:
  ```
  .env
  .env.local
  node_modules/
  dist/
  .DS_Store
  ```

### Configuration Netlify UI
1. [ ] Aller à https://app.netlify.com
2. [ ] Cliquer "Add new site" > "Import an existing project"
3. [ ] Autoriser GitHub et sélectionner le repository
4. [ ] Vérifier les settings de build:
   - [ ] Build command: `npm run build`
   - [ ] Publish directory: `dist/spa`
   - [ ] Node version: 20.x

### Ajouter les variables d'environnement
1. [ ] Aller à Site settings > Build & deploy > Environment
2. [ ] Cliquer "Add environment variables"
3. [ ] Ajouter chaque variable:

| Variable | Valeur | Secret | Notes |
|----------|--------|--------|-------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Non | Public |
| `VITE_SUPABASE_ANON_KEY` | Depuis Supabase | Non | Public (clé anom) |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | **Oui** | Serveur uniquement |
| `SUPABASE_ANON_KEY` | Depuis Supabase | **Oui** | Serveur uniquement |
| `SUPABASE_SERVICE_ROLE_KEY` | Depuis Supabase | **Oui** | 🔴 TRÈS SECRET |
| `TWILIO_ACCOUNT_SID` | Depuis Twilio | **Oui** | Secret |
| `TWILIO_AUTH_TOKEN` | Depuis Twilio | **Oui** | 🔴 TRÈS SECRET |
| `TWILIO_PHONE_NUMBER` | `whatsapp:+xxx` | Non | Semi-public |
| `ADMIN_WHATSAPP` | `whatsapp:+xxx` | Non | Semi-public |

### Netlify.toml
- [ ] Fichier `netlify.toml` existe à la racine
- [ ] Contient les sections:
  - [ ] `[build]` avec `command = "npm run build"`
  - [ ] `[build]` avec `publish = "dist/spa"`
  - [ ] `[functions]` avec `node_bundler = "esbuild"`
  - [ ] `[[redirects]]` avec `/api/*` → `/.netlify/functions/node-build:splat`

---

## 🧪 Tests post-déploiement

### Vérifier le build
- [ ] Aller à https://app.netlify.com/sites/YOUR_SITE/deploys
- [ ] Vérifier que la dernière build réussit (statut ✅)
- [ ] Vérifier qu'il n'y a pas d'erreurs dans les logs

### Vérifier la connectivité
```bash
# Remplacer YOUR_SITE par votre domaine Netlify (ex: my-app.netlify.app)
NETLIFY_URL="https://YOUR_SITE.netlify.app"

# Test ping
curl $NETLIFY_URL/api/ping

# Test Supabase
curl -X POST $NETLIFY_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "generated_id": "E0001",
    "password": "test1234"
  }'

# Test Twilio
curl -X POST $NETLIFY_URL/api/whatsapp/send-registration \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "firstName": "Test",
      "lastName": "User"
    }
  }'
```

### Test complet d'inscription
1. [ ] Accéder à https://YOUR_SITE.netlify.app/register
2. [ ] Remplir tout le formulaire
3. [ ] Cliquer "Envoyer"
4. [ ] ✅ Vérifier que:
   - L'utilisateur est créé dans Supabase (`users` table)
   - Un message WhatsApp est reçu (check Twilio)
   - Le PDF est généré et téléchargeable
   - Pas d'erreur 500 dans Netlify Logs

### Vérifier les logs
1. [ ] Aller à Netlify > Logs > Functions
2. [ ] Vérifier qu'il n'y a pas d'erreurs:
   - ❌ `undefined SUPABASE_URL`
   - ❌ `undefined TWILIO_ACCOUNT_SID`
   - ❌ `TypeError: Cannot read property...`

---

## 🔐 Sécurité - Avant le déploiement

- [ ] `.env.local` n'est PAS commité
- [ ] `.env.example` contient SEULEMENT les noms des variables, pas les vraies valeurs
- [ ] `SUPABASE_SERVICE_ROLE_KEY` n'est défini que dans Netlify, pas dans le repo
- [ ] `TWILIO_AUTH_TOKEN` n'est défini que dans Netlify, pas dans le repo
- [ ] Les variables "Secret" sont marquées comme telles dans Netlify UI
- [ ] HTTPS est activé (automatique sur Netlify)

---

## ⏱️ Troubleshooting

### Le build échoue
```
Error: Cannot find module 'express'
```
**Solution:** `npm run build` en local d'abord, puis commit

### Erreur "Supabase configuration missing"
**Cause:** Variables d'environnement non définies
**Solution:**
1. Vérifier dans Netlify UI que les variables sont ajoutées
2. Redéployer: Deploys > Trigger deploy > Deploy site

### Erreur "Twilio configuration missing"
**Cause:** Twilio variables non définies
**Solution:**
1. Ajouter `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, etc. dans Netlify
2. Marquer comme "Secret" dans Netlify UI
3. Redéployer

### PDF génération échoue ("Wrong PNG signature")
**Status:** ✅ Déjà fixé dans le code (utilise JPEG)
**Vérification:** Accéder à `/account-confirmation` après inscription

### Les fonctions sont lentes (5-10s)
**Normal:** C'est un "cold start" Netlify
**Non-fixable:** Ce comportement est standard (s'améliore avec le temps)

---

## 📞 Ressources Utiles

### Documentation
- [Netlify Docs](https://docs.netlify.com)
- [Supabase Docs](https://supabase.com/docs)
- [Twilio Docs](https://www.twilio.com/docs)

### Consoles
- [Netlify Dashboard](https://app.netlify.com)
- [Supabase Dashboard](https://app.supabase.com)
- [Twilio Console](https://console.twilio.com)

### Support
- Netlify Support: https://support.netlify.com
- Supabase Support: https://github.com/supabase/supabase/discussions
- Twilio Support: https://www.twilio.com/help/contact

---

## ✨ Prêt pour le déploiement?

Quand tout est coché ✅:
1. Tous les tests locaux passent
2. Variables Netlify configurées
3. Logs Netlify sans erreurs

**Votre application est prête en production!**

🚀 **URL:** https://YOUR_SITE.netlify.app
