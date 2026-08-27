# astro-lead-site-template

Starter réutilisable pour des sites de lead-gen locaux (pattern `{intent}-{ville}/`), en
Astro statique + Cloudflare Pages. Pensé comme alternative au pipeline PHP `/gen-lead-site`,
en corrigeant dès le départ le point faible identifié dessus : le contenu "spinné" par ville
(cf. mémoire `feedback_leadgen_thin_content`).

## Différences avec le pipeline PHP existant

| | PHP (`/gen-lead-site`) | Ce starter |
|---|---|---|
| Contenu par ville | Copy pseudo-aléatoire (crc32, 3-8 variantes/bloc) | Contenu unique généré par LLM, une fois, mis en cache dans le repo |
| Hébergement | MassiveHoster mutualisé (PHP) | Cloudflare Pages (statique) |
| Formulaire | Backend PHP interne | Cloudflare Pages Function + Resend (email) + Turnstile (anti-spam) |
| Gate d'indexation | `INDEXABLE_CITIES` dans config.php | champ `indexable` dans `src/data/cities.json`, répercuté sur `<meta robots>` et `sitemap.xml` |

## Démarrer un nouveau site à partir de ce starter

```bash
cp -r astro-lead-site-template mon-nouveau-site
cd mon-nouveau-site
npm install
```

1. **Configurer le site** : éditer `src/data/site.config.json` (nom, domaine, téléphone, email, couleur...).
2. **Définir les services** : `src/data/intents.json` (un objet par intent/service proposé).
3. **Définir les villes** : `src/data/cities.json`. Chaque ville a un champ `indexable` :
   commencer à `false` pour toute nouvelle ville, ne passer à `true` qu'une fois la page
   indexée et éprouvée (trafic, pas de pénalité) — voir la mémoire `feedback_leadgen_thin_content`
   pour le pourquoi. Une ville non indexable reste crawlable (`noindex,follow`, liens internes
   toujours présents) mais absente du `sitemap.xml`.
4. **Générer le contenu unique par ville** :
   ```bash
   ANTHROPIC_API_KEY=sk-ant-... npm run generate:content
   ```
   Idempotent : ne régénère pas les fichiers déjà présents dans `src/content/cityContent/`
   sauf `--force`. Relire/éditer le contenu généré avant mise en prod — le script est un
   point de départ, pas une garantie anti-spam à lui seul.
5. **Vérifier en local** : `npm run dev`, `npm run build` puis `npm run preview`.

## Déploiement sur Cloudflare Pages

1. Pousser le repo sur GitHub, connecter le repo dans Cloudflare Pages.
2. Build command: `npm run build` — Output directory: `dist`.
3. Le dossier `functions/api/lead.js` est détecté automatiquement par Cloudflare Pages
   (Pages Functions), pas de config supplémentaire nécessaire.
4. Dans Pages > Settings > Environment variables, définir (Production **et** Preview) :
   - `TURNSTILE_SECRET_KEY`
   - `RESEND_API_KEY`
   - `LEAD_TO_EMAIL`
   - `LEAD_FROM_EMAIL` (adresse vérifiée côté Resend)
5. Dans Pages > Settings > Variables and secrets côté **build** (pas Functions), définir
   `PUBLIC_TURNSTILE_SITE_KEY` pour que le widget Turnstile s'affiche côté client.

## Mettre en place Turnstile (gratuit)

Dashboard Cloudflare > Turnstile > Add widget. Récupérer la "Site key" (publique,
`PUBLIC_TURNSTILE_SITE_KEY`) et la "Secret key" (`TURNSTILE_SECRET_KEY`, jamais exposée
côté client).

## Mettre en place Resend (gratuit, 3000 emails/mois)

Créer un compte sur resend.com, vérifier le domaine d'envoi (DNS: SPF/DKIM fournis par
Resend), créer une API key. `LEAD_FROM_EMAIL` doit être une adresse sur ce domaine vérifié.

## Structure

```
src/data/site.config.json     configuration du site (nom, domaine, contact, thème)
src/data/intents.json         liste des services proposés
src/data/cities.json          liste des villes + gate d'indexation
src/content/cityContent/      contenu unique par ville x intent (généré ou édité à la main)
src/content/config.ts         schéma de la collection cityContent
src/pages/[intentSlug]-[citySlug].astro   page programmatique ville x service
src/pages/sitemap.xml.ts      sitemap filtré sur indexable=true uniquement
src/pages/robots.txt.ts       robots.txt dynamique
functions/api/lead.js         Cloudflare Pages Function: vérif Turnstile + envoi Resend
scripts/generate-city-content.mjs   génération LLM du contenu par ville (idempotent)
```

## Portfolio / réseau de sites

Si ce starter sert à plusieurs domaines, éviter de répliquer l'empreinte technique partagée
identifiée sur le pipeline PHP (même email de contact, même compte analytics sur tous les
sites) — voir `feedback_leadgen_thin_content` pour le détail du risque "réseau de sites".
