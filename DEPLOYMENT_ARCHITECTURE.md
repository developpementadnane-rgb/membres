# 📐 Architecture de Déploiement

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        UTILISATEUR (Browser)                    │
│                      https://votre-site.app                     │
└────────────────────────────┬──────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
         [SPA React]                   [API Calls]
         dist/spa/*                     /api/xxx
              │                             │
              ▼                             ▼
    ┌────────────────────────────────────────────────┐
    │         NETLIFY EDGE FUNCTIONS / CDN           │
    │  - Sert les assets statiques                   │
    │  - Route les appels API au serveur             │
    └────────┬─────────────────────────────┬────────┘
             │                             │
    ┌────────▼──────────────────────────────▼────────┐
    │      NETLIFY SERVERLESS FUNCTIONS               │
    │  /.netlify/functions/node-build                │
    │  (Express.js wrapped avec serverless-http)     │
    │                                                 │
    │  Routes:                                        │
    │  POST /api/auth/register                        │
    │  POST /api/auth/login                           │
    │  POST /api/whatsapp/send-registration           │
    │  POST /api/ideas/send-notification              │
    └────────┬─────────────────────────────┬────────┘
             │                             │
    ┌────────▼──────────┐      ┌─────────▼────────┐
    │                   │      │                  │
    │  SUPABASE DB      │      │  TWILIO API      │
    │  ─────────────    │      │  ────────────    │
    │  • users          │      │  • REST API      │
    │  • sessions       │      │  • WhatsApp      │
    │  • reports        │      │  • Notifications │
    │  • ideas          │      │                  │
    │  • patrols        │      │  Format:         │
    │  • roles          │      │  whatsapp:+xxx   │
    │                   │      │                  │
    │  URL:             │      │  Credentials:    │
    │  xxxxx.supabase   │      │  • Account SID   │
    │                   │      │  • Auth Token    │
    └───────────────────┘      └──────────────────┘
```

---

## 🔄 Flux de Requête - Exemple: Inscription

```
USER fills registration form
        │
        ▼
[client/pages/Register.tsx]
        │
        │ POST /api/auth/register
        │ (firstName, lastName, password, etc.)
        ▼
    [Netlify CDN Edge]
        │
        │ Redirect to serverless function
        ▼
[.netlify/functions/node-build]
(server/node-build.ts)
        │
        ▼
[Express App]
        │
        ├─► [server/routes/auth.ts]
        │   handleRegister()
        │       │
        │       ├─► Hash password
        │       │
        │       ├─► Insert user to Supabase
        │       │   users table
        │       │
        │       └─► Return user data
        │
        └─► [server/routes/whatsapp.ts]
            handleSendRegistrationWhatsApp()
                │
                ├─► Format message
                │
                ├─► Call Twilio REST API
                │   POST https://api.twilio.com/
                │   2010-04-01/Accounts/.../Messages.json
                │
                └─► Send WhatsApp to ADMIN_WHATSAPP
                    whatsapp:+212xxx
        
        ▼
[Response to Client]
{
  "success": true,
  "user_id": "...",
  "generated_id": "E0001"
}
        │
        ▼
[client/pages/AccountConfirmation.tsx]
        │
        ├─► Generate PDF
        │
        ├─► Generate QR Code
        │
        └─► User can download
```

---

## 📦 Variables d'Environnement - Qui utilise quoi?

```
┌─────────────────────────────────────────────┐
│         BUILD TIME (npm run build)          │
│  (Variables injectées dans le code)         │
└─────────────────────────────────────────────┘
        │
        ├─► VITE_SUPABASE_URL
        │   └─► Utilisée par [client/lib/supabase.ts]
        │       createClient(VITE_SUPABASE_URL, ...)
        │
        ├─► VITE_SUPABASE_ANON_KEY
        │   └─► Utilisée par [client/lib/supabase.ts]
        │       createClient(..., VITE_SUPABASE_ANON_KEY)
        │
        └─► (aucune autre VITE_ nécessaire)


┌─────────────────────────────────────────────┐
│    RUNTIME (Netlify Serverless Function)    │
│  (Variables disponibles via process.env)    │
└─────────────────────────────────────────────┘
        │
        ├─► SUPABASE_URL
        │   └─► Utilisée par [server/routes/auth.ts]
        │       getSupabaseClient()
        │
        ├─► SUPABASE_ANON_KEY
        │   └─► Utilisée par [server/routes/auth.ts]
        │       getSupabaseClient()
        │
        ├─► SUPABASE_SERVICE_ROLE_KEY
        │   └─► Potentiellement pour opérations admin
        │       (à configurer si nécessaire)
        │
        ├─► TWILIO_ACCOUNT_SID
        │   └─► Utilisée par [server/routes/whatsapp.ts]
        │       & [server/routes/ideas.ts]
        │
        ├─► TWILIO_AUTH_TOKEN
        │   └─► Utilisée par [server/routes/whatsapp.ts]
        │       & [server/routes/ideas.ts]
        │
        ├─► TWILIO_PHONE_NUMBER
        │   └─► Utilisée par [server/routes/whatsapp.ts]
        │       From: process.env.TWILIO_PHONE_NUMBER
        │
        └─► ADMIN_WHATSAPP
            └─► Utilisée par [server/routes/whatsapp.ts]
                & [server/routes/ideas.ts]
                To: process.env.ADMIN_WHATSAPP
```

---

## 🔐 Sécurité - Ce qui est public vs secret

```
┌─────────────────────────────────────────────────────┐
│            CLIENT (PUBLIC - dans le JS)             │
│  Visible par n'importe qui qui inspecte le code     │
└─────────────────────────────────────────────────────┘

    VITE_SUPABASE_URL
    ✅ PUBLIC - URL Supabase
    
    VITE_SUPABASE_ANON_KEY
    ✅ PUBLIC - Clé anonyme (permissions limitées)


┌─────────────────────────────────────────────────────┐
│           SERVER (SECRET - Netlify seulement)       │
│  Jamais accessible au client, jamais en git         │
└─────────────────────────────────────────────────────┘

    SUPABASE_URL
    🔒 SECRET - URL (serverr)
    
    SUPABASE_ANON_KEY
    🔒 SECRET - Clé (serveur)
    
    SUPABASE_SERVICE_ROLE_KEY
    🔴 TRÈS SECRET - Admin rights!
    
    TWILIO_ACCOUNT_SID
    🔒 SECRET - ID compte
    
    TWILIO_AUTH_TOKEN
    🔴 TRÈS SECRET - Credentials d'auth
    
    TWILIO_PHONE_NUMBER
    🟡 SEMI-PUBLIC - Visible mais nécessaire
    
    ADMIN_WHATSAPP
    🟡 SEMI-PUBLIC - Numero destinataire


┌─────────────────────────────────────────────────────┐
│              STOCKER OÙ?                            │
└─────────────────────────────────────────────────────┘

    LOCAL DEV:
    .env.local          ← Jamais commiter!

    PRODUCTION:
    Netlify UI          ← Site settings → Environment
```

---

## 🚀 Processus de Déploiement

```
1. GIT PUSH
   GitHub repo
        │
        ▼
   [GitHub Webhook]
        │
        ▼
2. NETLIFY DETECTED PUSH
   Netlify builds your site
        │
        ├─► Clone repo
        ├─► npm install
        ├─► npm run build
        │   ├─► vite build (client → dist/spa)
        │   └─► vite build --config (server → dist/server/node-build.mjs)
        │
        ▼
3. DEPLOY
   Copy dist/spa/ to Netlify Edge
   Copy dist/server/node-build.mjs to Functions
        │
        ▼
4. LIVE
   https://votre-site.netlify.app
   Accessible à tous
```

---

## 📊 Dépendances du déploiement

### Pour Supabase fonctionner
```
✅ npm packages:
   - @supabase/supabase-js

✅ Netlify env vars:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (optionnel)

✅ Supabase side:
   - Tables créées (users, sessions, etc.)
   - RLS policies configurées (si nécessaire)
```

### Pour Twilio fonctionner
```
✅ npm packages:
   - (aucun - utilise fetch API)

✅ Netlify env vars:
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN
   - TWILIO_PHONE_NUMBER
   - ADMIN_WHATSAPP

✅ Twilio side:
   - Compte créé
   - Numéro de téléphone ajouté
   - WhatsApp activé sur le numéro
```

### Pour Netlify Functions fonctionner
```
✅ npm packages:
   - serverless-http
   - express
   - cors

✅ Configuration:
   - netlify.toml (redirects /api/*)
   - server/node-build.ts (exporte handler)
   - vite.config.server.ts (build correct)

✅ Netlify side:
   - Build command: npm run build
   - Publish dir: dist/spa
   - Functions dir: dist/server
```

---

## 🔗 Connexions et flux de données

```
┌─────────────────────────────────────────────────────────────┐
│                    ÉTAPE 1: REGISTRATION                    │
│                                                             │
│ User → Form → [Register.tsx]                               │
│                    │                                       │
│                    └─► POST /api/auth/register              │
│                             │                              │
│                             ▼                              │
│                    [auth.ts - handleRegister]              │
│                             │                              │
│                 ┌───────────┼───────────┐                 │
│                 │           │           │                 │
│                 ▼           ▼           ▼                 │
│           [Hash pwd]   [Supabase]   [Twilio]              │
│                 │       Insert      Send WhatsApp          │
│                 │       User         to Admin              │
│                 │           │           │                 │
│                 └───────────┼───────────┘                 │
│                             │                              │
│                             ▼                              │
│                    Response: user_id                       │
│                             │                              │
│                             ▼                              │
│ User → AccountConfirmation.tsx                             │
│        Generate PDF + QR Code                              │
│        POST /api/auth/save-documents                       │
│        (Save PDF URL to Supabase)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 Performance & Scalabilité

```
                    COLD START (première requête)
                    │
                    ├─ 5-10 secondes
                    │
                    └─ Netlify spin-up serverless function
                    
                    WARM REQUEST (requêtes suivantes)
                    │
                    └─ < 1 seconde
                    
                    
        Supabase Performance:
        │
        ├─ Free tier: 500MB DB, 2GB File storage
        └─ Scalable: illimité avec upgrade
        
        
        Twilio Rate:
        │
        └─ Pay-as-you-go: $0.0075 per SMS
        
        
        Netlify Limits:
        │
        ├─ Free: 125k function invocations/month
        ├─ 10s function timeout
        └─ Scalable: ajout d'options payantes
```

---

## ✅ Checklist d'Architecture

- [ ] Frontend (SPA React) séparé du serveur ✅
- [ ] API serveur wrappée avec serverless-http ✅
- [ ] Variables d'environnement séparées (client vs serveur) ✅
- [ ] Secrets gardés hors du repo ✅
- [ ] Netlify CDN pour assets statiques ✅
- [ ] Netlify Functions pour API ✅
- [ ] Supabase pour BD et authentification ✅
- [ ] Twilio pour notifications WhatsApp ✅
- [ ] CORS configuré pour cross-origin ✅
- [ ] Build configuration (netlify.toml) ✅

Votre architecture est **production-ready**! 🎉
