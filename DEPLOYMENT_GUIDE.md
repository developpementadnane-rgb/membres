# Guide de Déploiement - Netlify + Twilio + Supabase

## 🎯 Vue d'ensemble

Ce guide couvre la configuration complète pour déployer l'application sur Netlify avec intégration Twilio (WhatsApp) et Supabase (authentification + base de données).

---

## 📋 Table des matières

1. [Côté Code - Avant le déploiement](#-côté-code)
2. [Configuration Supabase](#-supabase)
3. [Configuration Twilio](#-twilio)
4. [Configuration Netlify](#-netlify)
5. [Variables d'environnement](#-variables-denvironnement)
6. [Vérification post-déploiement](#-vérification-post-déploiement)

---

## 🔧 Côté Code

### Fichiers à vérifier

#### 1. **`client/lib/supabase.ts`** - Client Supabase (côté navigateur)
```typescript
// ✅ DÉJÀ CONFIGURÉ
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```
- Utilise les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
- Le préfixe `VITE_` les rend accessibles au navigateur

#### 2. **`server/routes/auth.ts`** - Authentification serveur
```typescript
// ✅ DÉJÀ CONFIGURÉ
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  return createClient(supabaseUrl, supabaseAnonKey);
}
```
**Endpoints:**
- `POST /api/auth/register` - Inscription utilisateur
- `POST /api/auth/login` - Connexion
- `POST /api/auth/save-documents` - Sauvegarde PDF/QR code
- `GET /api/auth/profile` - Profil utilisateur

#### 3. **`server/routes/whatsapp.ts`** - Notifications Twilio
```typescript
// ⚠️ À CONFIGURER - Utilise les variables suivantes:
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
ADMIN_WHATSAPP=whatsapp:+212612345678
```
**Endpoints:**
- `POST /api/whatsapp/send-registration` - Notification inscription
- `POST /api/whatsapp/incoming-idea` - Notification d'idée

#### 4. **`server/routes/ideas.ts`** - Notifications d'idées
```typescript
// ⚠️ À CONFIGURER - Utilise les variables Twilio ci-dessus
```
**Endpoint:**
- `POST /api/ideas/send-notification` - Envoie une notification WhatsApp

#### 5. **`server/index.ts`** - Configuration du serveur
Vérifier que les variables d'environnement sont chargées:
```typescript
// ✅ DÉJÀ EN PLACE
import dotenv from 'dotenv';
dotenv.config();
```

---

## 🗄️ Supabase - Configuration

### Étape 1: Vérifier les tables Supabase

Assurez-vous que les tables suivantes existent dans votre projet Supabase:

| Table | Colonnes clés | Description |
|-------|--------------|-------------|
| `users` | `id`, `generated_id`, `first_name`, `last_name`, `password`, `pdf_url`, `qr_code_url` | Utilisateurs inscrits |
| `sessions` | `id`, `title`, `date_time`, `location`, `pdf_url` | Jlsessions de formation |
| `reports` | `id`, `user_id`, `title`, `content`, `created_at` | Rapports utilisateurs |
| `ideas` | `id`, `title`, `description`, `category`, `created_at` | Boîte à idées |
| `patrols` | `id`, `name` | Dories/patrouilles |
| `roles` | `id`, `name` | Rôles des utilisateurs |

### Étape 2: Variables d'environnement Supabase

Récupérez ces valeurs depuis: **Settings > API** dans votre projet Supabase
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (clé secrète!)
```

**⚠️ Important:**
- `VITE_*` = publiques (pour le navigateur)
- `SUPABASE_*` sans VITE = privées (serveur uniquement)
- `SERVICE_ROLE_KEY` = très secrète, serveur uniquement

### Étape 3: Row Level Security (RLS)

⚠️ **À CONFIGURER APRÈS LE DÉPLOIEMENT**

Aller dans Supabase > **Authentication > Policies**

Exemple de politique pour la table `users`:
```sql
-- Permettre aux utilisateurs de lire leurs propres données
CREATE POLICY "Users can read own data"
ON public.users FOR SELECT
USING (auth.uid() = id);

-- Permettre les inscriptions (publiques)
CREATE POLICY "Anyone can register"
ON public.users FOR INSERT
WITH CHECK (true);
```

---

## 📱 Twilio - Configuration

### Étape 1: Créer un compte Twilio

1. Aller sur https://www.twilio.com/console
2. S'inscrire ou se connecter
3. Aller à **Console > Settings > Account**

### Étape 2: Récupérer les credentials

| Variable | Où la trouver |
|----------|--------------|
| `TWILIO_ACCOUNT_SID` | Console > Account SID |
| `TWILIO_AUTH_TOKEN` | Console > Auth Token (⚠️ Gardez secret!) |
| `TWILIO_WHATSAPP_NUMBER` | Messaging > Phone Numbers (format: `whatsapp:+1234567890`) |
| `ADMIN_WHATSAPP` | Votre numéro d'administration (format: `whatsapp:+212612345678`) |

### Étape 3: Configurer WhatsApp

1. Aller à **Console > Messaging > Phone Numbers**
2. Ajouter un numéro de téléphone
3. Activer WhatsApp sur ce numéro
4. Tester avec un numéro sandbox (pour développement)

### Étape 4: Variables d'environnement Twilio

```
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
ADMIN_WHATSAPP=whatsapp:+212612345678
```

**⚠️ Important:**
- `TWILIO_AUTH_TOKEN` est très sensible
- Jamais le commiter dans Git
- Stocker dans Netlify (secrets)

---

## 🚀 Netlify - Configuration

### Étape 1: Connecter le repository

1. Aller à https://app.netlify.com
2. Cliquer sur **"Add new site"**
3. Choisir **"Import an existing project"**
4. Sélectionner **GitHub** et autoriser
5. Choisir votre repository

### Étape 2: Configuration du build

Netlify va détecter automatiquement:
- **Build command:** `npm run build`
- **Publish directory:** `dist/spa`

**À VÉRIFIER dans Netlify:**

1. **Site settings > Build & deploy > Build settings**
   ```
   Build command: npm run build
   Publish directory: dist/spa
   ```

2. **Environment variables** (voir section suivante)

### Étape 3: Configurer les fonctions serveur

Netlify a besoin de wrapper les endpoints Express.

**Fichier: `netlify.toml`** - À créer à la racine:

```toml
[build]
  command = "npm run build"
  functions = "dist/server"
  publish = "dist/spa"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/node-build/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Étape 4: Dépendances

Vérifier que `package.json` contient:
```json
{
  "dependencies": {
    "serverless-http": "^3.2.0",
    "express": "^5.1.0",
    "@supabase/supabase-js": "^2.98.0"
  }
}
```

Ces dépendances sont déjà dans le projet ✅

---

## 🔐 Variables d'Environnement

### Dans Netlify

**Site settings > Build & deploy > Environment**

Ajouter toutes les variables:

| Variable | Valeur | Visible | Type |
|----------|--------|---------|------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | 🟢 Public | Build |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | 🟡 Limité | Build |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | 🔴 Secret | Build |
| `SUPABASE_ANON_KEY` | `eyJhbGc...` | 🔴 Secret | Build |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | 🔴 Secret | Build |
| `TWILIO_ACCOUNT_SID` | `ACxxxxx` | 🔴 Secret | Build |
| `TWILIO_AUTH_TOKEN` | `xxx` | 🔴 Secret | Build |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+1234567890` | 🟡 Limité | Build |
| `ADMIN_WHATSAPP` | `whatsapp:+212xxx` | 🟡 Limité | Build |

### Variables de build vs runtime

**À la build:**
- `VITE_*` - Injectées dans le client JavaScript
- `SUPABASE_*` - Disponibles au serveur Express

**À la runtime:**
- `SUPABASE_SERVICE_ROLE_KEY` - Utilisé seulement par les fonctions serveur

---

## ✅ Vérification Post-Déploiement

### Étape 1: Vérifier la connexion Supabase

```bash
# Test endpoint /api/auth/login
curl -X POST https://votre-site.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "generated_id": "E0001",
    "password": "test1234"
  }'

# Réponse attendue: 200 ou 401 (pas 500 avec "Supabase error")
```

### Étape 2: Vérifier Twilio

```bash
# Test endpoint /api/whatsapp/send-registration
curl -X POST https://votre-site.netlify.app/api/whatsapp/send-registration \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "firstName": "Test",
      "lastName": "User",
      "userPhone": "+212612345678"
    }
  }'

# Réponse attendue: 200 (pas 500 avec "Twilio configuration missing")
```

### Étape 3: Vérifier les logs

1. Netlify **Logs > Functions**
2. Vérifier qu'il n'y a pas d'erreurs comme:
   - `undefined SUPABASE_URL`
   - `undefined TWILIO_ACCOUNT_SID`
   - `TypeError: Cannot read property...`

### Étape 4: Teste l'inscription complète

1. Accéder à https://votre-site.netlify.app/register
2. Remplir le formulaire
3. Vérifier que:
   - ✅ L'utilisateur est créé dans Supabase
   - ✅ Un message WhatsApp est envoyé (check Twilio console)
   - ✅ Le PDF et QR code sont générés

---

## 🔧 Troubleshooting

### Erreur: "Supabase configuration missing"

**Cause:** Les variables `SUPABASE_URL` ou `SUPABASE_ANON_KEY` ne sont pas définies
**Solution:**
1. Vérifier dans Netlify > Environment variables
2. Relancer le build: **Deploys > Trigger deploy > Deploy site**

### Erreur: "Twilio configuration missing"

**Cause:** Les variables Twilio ne sont pas définies
**Solution:**
1. Ajouter les 4 variables Twilio dans Netlify
2. Redéployer
3. Vérifier que `TWILIO_AUTH_TOKEN` est marqué comme "secret"

### Erreur: "Wrong PNG signature" (PDF)

**Cause:** Encodage d'image incorrect
**Solution:** ✅ Déjà fixé dans le code (utilise JPEG au lieu de PNG)

### Connexion lente aux fonctions Netlify

**Normal pour les cold starts** - La première requête peut prendre 5-10 secondes
- Pas de solution (comportement Netlify par défaut)
- Ça s'améliore avec les requêtes suivantes

---

## 📊 Checklist de déploiement

### Avant de déployer
- [ ] Toutes les tables Supabase existent
- [ ] Compte Twilio créé
- [ ] Variables d'environnement testées localement
- [ ] Build réussit localement: `npm run build`
- [ ] Pas d'erreurs TypeScript: `npm run typecheck`

### Netlify configuration
- [ ] Repository connecté
- [ ] Build command correct
- [ ] Environment variables toutes ajoutées
- [ ] netlify.toml créé à la racine

### Post-déploiement
- [ ] Connexion Supabase fonctionne
- [ ] Twilio envoie les messages
- [ ] Logs Netlify sans erreurs
- [ ] Inscription complète (du formulaire au PDF) fonctionne

---

## 📞 Support & Ressources

### Supabase
- Documentation: https://supabase.com/docs
- Dashboard: https://app.supabase.com

### Twilio
- Documentation: https://www.twilio.com/docs
- Console: https://www.twilio.com/console
- Pricing: https://www.twilio.com/en-us/sms/pricing

### Netlify
- Documentation: https://docs.netlify.com
- Dashboard: https://app.netlify.com
- Logs: https://docs.netlify.com/netlify-cli/get-started/

### GitHub Actions (CI/CD optionnel)
Pour redéployer automatiquement après chaque push:
https://docs.netlify.com/configure-builds/overview/

---

## 🎉 Après le déploiement

Votre application sera opérationnelle avec:
✅ Authentification Supabase fonctionnelle
✅ Base de données synchronisée
✅ Notifications WhatsApp via Twilio
✅ PDF générés et stockés
✅ Disponible publiquement

**URL:** https://votre-site.netlify.app
