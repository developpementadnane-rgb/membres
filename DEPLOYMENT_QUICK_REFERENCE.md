# ⚡ Guide Rapide: Déployer en 30 minutes

## 🎯 Les 3 services requis

| Service | Tâche | Durée |
|---------|-------|-------|
| **Supabase** | Créer projet + copier clés | 5 min |
| **Twilio** | Créer compte + WhatsApp + copier clés | 5 min |
| **Netlify** | Ajouter variables + deploy | 15 min |

---

## 1️⃣ SUPABASE (5 min)

### Créer un projet
```
1. https://app.supabase.com
2. New project
3. Copier l'URL et les clés
```

### Copier ces valeurs:
```
VITE_SUPABASE_URL = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGc...
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGc... (🔴SECRET)
```

### Créer les tables (optionnel, mais recommandé)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  generated_id TEXT,
  first_name TEXT,
  last_name TEXT,
  password TEXT,
  pdf_url TEXT,
  qr_code_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 2️⃣ TWILIO (5 min)

### Créer un compte
```
1. https://console.twilio.com
2. Sign up
3. Phone Numbers → Add number
4. Messaging → Enable WhatsApp
```

### Copier ces valeurs:
```
TWILIO_ACCOUNT_SID = ACxxxxx
TWILIO_AUTH_TOKEN = xxxxx (🔴SECRET)
TWILIO_PHONE_NUMBER = whatsapp:+1234567890
ADMIN_WHATSAPP = whatsapp:+212612345678  ← VOTRE NUMÉRO
```

---

## 3️⃣ NETLIFY (15 min)

### Connecter GitHub
```
1. https://app.netlify.com
2. Add new site → Import existing project
3. Choose GitHub repo
4. Deploy!
```

### Ajouter les 9 variables
```
Site settings → Environment → Add variables
```

| Variable | Secret? | Valeur |
|----------|---------|--------|
| `VITE_SUPABASE_URL` | ❌ | https://xxxxx.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | ❌ | eyJhbGc... |
| `SUPABASE_URL` | ✅ | https://xxxxx.supabase.co |
| `SUPABASE_ANON_KEY` | ✅ | eyJhbGc... |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | eyJhbGc... |
| `TWILIO_ACCOUNT_SID` | ✅ | ACxxxxx |
| `TWILIO_AUTH_TOKEN` | ✅ | xxxxx |
| `TWILIO_PHONE_NUMBER` | ❌ | whatsapp:+xxx |
| `ADMIN_WHATSAPP` | ❌ | whatsapp:+212xxx |

### Déclencher le déploiement
```
Deploys → Trigger deploy → Deploy site
```

---

## ✅ Test Post-Déploiement

```bash
# URL de votre site
SITE="https://votre-site.netlify.app"

# Test 1: Ping simple
curl $SITE/api/ping

# Test 2: Inscription
# 1. Aller à $SITE/register
# 2. Remplir le formulaire
# 3. Soumettre
# 4. ✅ Vérifier que:
#    - Pas d'erreur 500
#    - Utilisateur dans Supabase
#    - Message WhatsApp reçu
```

---

## 🚨 Erreurs courants

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Supabase configuration missing" | Vars pas ajoutées | Ajouter dans Netlify + redéployer |
| "Twilio configuration missing" | Vars pas ajoutées | Ajouter dans Netlify + redéployer |
| Build échoue | Problème npm | `npm run build` en local |
| Fonctions lentes (5-10s) | Cold start | Normal, se réchauffe après |

---

## 📚 Documentations complètes

Si vous besoin de plus de détails:
- `DEPLOYMENT_GUIDE.md` - Guide complet (400+ lignes)
- `DEPLOYMENT_CHECKLIST.md` - Checklist détaillée
- `DEPLOYMENT_TODO.md` - Ce qui est fait vs à faire
- `DEPLOYMENT_ARCHITECTURE.md` - Diagrammes et flux

---

## ⏱️ Timeline estimée

```
Supabase setup:        5 min  |████|
Twilio setup:          5 min  |████|
Netlify config:       10 min  |████████|
Netlify deploy:        5 min  |████|
Test & verify:         5 min  |████|
                       ─────────────
TOTAL:                30 min  ✅
```

---

## 🎉 Après le déploiement

Votre app sera live à:
```
https://votre-site.netlify.app
```

Avec:
- ✅ Authentification (Supabase)
- ✅ Base de données (Supabase)
- ✅ Notifications WhatsApp (Twilio)
- ✅ API serveur (Netlify Functions)

---

## 💡 Tips

1. **Garder les secrets sécurisés:**
   - Jamais commiter `.env.local`
   - Utiliser Netlify UI pour les variables

2. **Tester localement:**
   - `npm run build` doit réussir
   - `npm run dev` doit fonctionner

3. **Redéployer après changement:**
   - Ajouter une variable → Redéployer
   - Modifier code → Git push (auto-deploy)

---

**Prêt? Commencez par Supabase!** 🚀
