# 🚀 Guide Rapide: Déploiement Netlify

**Durée estimée:** 15-20 minutes

---

## 3 Étapes principales

### 1️⃣ Préparer les Credentials (5 min)

#### Supabase
1. Aller à https://app.supabase.com
2. Sélectionner votre projet
3. Settings → API → Copier les 3 clés:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (🔴 secret)

#### Twilio
1. Aller à https://console.twilio.com
2. Account SID & Auth Token (Settings)
3. Phone Numbers → Ajouter un numéro WhatsApp
4. Copier: `TWILIO_PHONE_NUMBER` (format: `whatsapp:+xxx`)

#### Votre numéro Admin WhatsApp
Définir dans Netlify: `ADMIN_WHATSAPP=whatsapp:+212xxx`

### 2️⃣ Configurer Netlify (5 min)

1. Aller à https://app.netlify.com
2. **Add new site** → **Import existing project**
3. Autoriser GitHub et choisir votre repo
4. Netilfy détecte automatiquement:
   - Build: `npm run build` ✅
   - Directory: `dist/spa` ✅

5. **Site settings → Environment**
   - Ajouter les **9 variables** (voir tableau ci-dessous)

### 3️⃣ Tester post-déploiement (5 min)

```bash
# Tester les endpoints
curl https://votre-site.netlify.app/api/ping

# Accéder à /register et faire une inscription test
# Vérifier que le message WhatsApp arrive
```

---

## Variables à ajouter dans Netlify

| Variable | Secret? | Depuis | Exemple |
|----------|---------|--------|---------|
| `VITE_SUPABASE_URL` | Non | Supabase API | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Non | Supabase API | `eyJhbGc...` |
| `SUPABASE_URL` | **OUI** | Supabase API | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | **OUI** | Supabase API | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | **OUI** 🔴 | Supabase API | `eyJhbGc...` |
| `TWILIO_ACCOUNT_SID` | **OUI** | Twilio Console | `ACxxxxx` |
| `TWILIO_AUTH_TOKEN` | **OUI** 🔴 | Twilio Console | `xxx` |
| `TWILIO_PHONE_NUMBER` | Non | Twilio Phone Numbers | `whatsapp:+1234567890` |
| `ADMIN_WHATSAPP` | Non | Vous | `whatsapp:+212xxx` |

**Comment ajouter dans Netlify:**
1. Site settings → Build & deploy → **Environment**
2. Click "Add environment variables"
3. Ajouter chaque variable
4. Pour les variables **Secret**, utiliser le toggle "Secret"
5. Save
6. **Deploy site** (Deploys → Trigger deploy)

---

## Fichiers importants

| Fichier | Rôle | Checklist |
|---------|------|----------|
| `netlify.toml` | Config build Netlify | ✅ Redirige `/api/*` vers functions |
| `server/node-build.ts` | Entrée serveur | ✅ Exporte `handler` pour serverless |
| `server/routes/whatsapp.ts` | Notifications WhatsApp | ✅ Utilise env vars Twilio |
| `server/routes/auth.ts` | Auth + BD | ✅ Utilise env vars Supabase |
| `.env.example` | Template variables | ✅ Jamais de vraies valeurs |

---

## Vérification rapide post-déploiement

### Étape 1: Build réussie?
```bash
Netlify > Deploys > Vérifier statut ✅
Logs > Vérifier qu'il n'y a pas d'erreurs
```

### Étape 2: APIs répondent?
```bash
# Remplacer par votre domaine
curl https://YOUR_SITE.netlify.app/api/ping
# Expected: {"message":"ping pong"}
```

### Étape 3: Inscription fonctionne?
```bash
1. Aller à https://YOUR_SITE.netlify.app/register
2. Remplir le formulaire
3. Soumettre
4. ✅ Vérifier:
   - Pas d'erreur 500
   - Utilisateur créé dans Supabase
   - Message WhatsApp reçu
```

---

## ⚠️ Erreurs courantes & solutions

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Supabase configuration missing` | Vars non définies | Ajouter dans Netlify + redéployer |
| `Twilio configuration missing` | Vars non définies | Ajouter dans Netlify + redéployer |
| Build échoue | Dépendances manquantes | `npm run build` en local d'abord |
| `Wrong PNG signature` | Encodage image | ✅ Déjà fixé (utilise JPEG) |
| Les fonctions sont lentes | Cold start | Normal (5-10s). S'améliore avec temps |

---

## Support & Ressources

### Documentation
- **Netlify:** https://docs.netlify.com
- **Supabase:** https://supabase.com/docs
- **Twilio:** https://www.twilio.com/docs

### Dashboards
- **Netlify:** https://app.netlify.com
- **Supabase:** https://app.supabase.com
- **Twilio:** https://console.twilio.com

### Documents du projet
- `DEPLOYMENT_GUIDE.md` - Guide complet détaillé
- `DEPLOYMENT_CHECKLIST.md` - Checklist complète

---

## ✅ Avant de commencer

- [ ] Repository sur GitHub
- [ ] Compte Supabase avec projet
- [ ] Compte Twilio avec WhatsApp activé
- [ ] Compte Netlify
- [ ] `npm run build` réussit localement

---

## 🎉 Après le déploiement

Votre application sera disponible à:
```
https://YOUR_SITE.netlify.app
```

Avec:
✅ Authentification fonctionnelle (Supabase)
✅ Base de données synchronisée
✅ Notifications WhatsApp (Twilio)
✅ PDF générés automatiquement
✅ Accessible publiquement

---

**Questions?** Consultez `DEPLOYMENT_GUIDE.md` pour plus de détails.
