# ECOSAC Gestion

Application web de gestion de l'usine ECOSAC (sacs en papier kraft, Côte d'Ivoire) :
achats de bobines par conteneur, colle, fournitures, clichés, production, impression
numérique, stock, ventes, clients, charges, prix de revient et marges.

## Ce qu'il y a dans ce dossier

| Fichier | Rôle |
|---|---|
| `index.html` | La page de l'application |
| `css/style.css` | L'apparence (couleurs vertes, mode sombre, mobile) |
| `js/app.js` | Toute la logique : calculs, formulaires, tableau de bord |
| `js/config.js` | Les deux codes de connexion à Supabase (à remplir) |
| `js/vendor/` | La bibliothèque Supabase, incluse pour ne dépendre d'aucun autre site |
| `supabase/schema.sql` | La base de données et ses règles de sécurité |
| `manifest.webmanifest`, `icons/` | Pour installer l'application sur l'écran d'accueil du téléphone |

Il n'y a rien à compiler : ce sont des fichiers prêts à être mis en ligne.

## Mise en ligne en 4 étapes (environ 20 minutes)

### 1. Créer la base de données (Supabase, gratuit)
1. Créez un compte sur https://supabase.com et un nouveau projet nommé `ecosac`.
   Choisissez la région **West EU (Paris)** ou la plus proche, et notez le mot de passe de la base.
2. Dans le menu de gauche, ouvrez **SQL Editor**, cliquez sur **New query**,
   collez tout le contenu de `supabase/schema.sql` et cliquez sur **Run**.
3. Ouvrez **Project Settings > API** et copiez :
   - **Project URL** (ressemble à `https://abcdxyz.supabase.co`)
   - la clé **anon public**

### 2. Remplir `js/config.js`
Collez les deux valeurs entre les guillemets :
```js
window.ECOSAC_CONFIG = {
  supabaseUrl: 'https://abcdxyz.supabase.co',
  supabaseKey: 'eyJhbGciOi...',
};
```
La clé « anon public » peut être visible : sans compte autorisé, elle ne donne accès à aucune donnée.

### 3. Mettre en ligne (Vercel, gratuit)
1. Mettez ce dossier dans un dépôt GitHub.
2. Sur https://vercel.com, connectez-vous avec GitHub, cliquez **Add New > Project**,
   choisissez le dépôt puis **Deploy** (aucun réglage à changer).
3. Vercel donne une adresse du type `https://ecosac-gestion.vercel.app`.
4. Revenez dans Supabase, **Authentication > URL Configuration**, et mettez cette adresse
   dans **Site URL** (pour que les liens reçus par e-mail ramènent à l'application).

### 4. Créer votre compte administrateur
Ouvrez l'adresse de l'application, cliquez **Créer un compte**, confirmez votre e-mail,
puis connectez-vous. **Le premier compte créé devient administrateur** : faites-le vous-même
tout de suite après l'étape 1.

## Ajouter une personne de l'équipe
1. La personne ouvre l'application et clique **Créer un compte**.
2. Vous allez dans **Produits & prix > Équipe**, saisissez son e-mail et cliquez **Donner accès**.
   - **Saisie** : peut tout enregistrer (achats, production, ventes…).
   - **Administrateur** : peut en plus gérer l'équipe.
3. Elle clique **J'ai reçu l'accès** et arrive dans l'application.

Une personne sans accès ne voit aucune donnée, même avec un compte.

## Bon à savoir
- **Temps réel** : une vente saisie sur un téléphone apparaît aussitôt sur l'ordinateur.
- **Sauvegarde** : dans **Produits & prix**, « Télécharger une sauvegarde » crée un fichier
  avec toutes les données. Faites-le chaque mois. Supabase garde aussi ses propres copies.
- **Ancienne version** : si vous avez saisi des données dans la première version (sur Claude),
  téléchargez une sauvegarde là-bas puis utilisez « Restaurer une sauvegarde » ici.
- **Sans configuration** : si `js/config.js` est vide, l'application marche en mode local,
  données gardées dans le navigateur seulement. Utile pour essayer, pas pour travailler.
- **Téléphone** : ouvrez l'adresse dans Chrome, menu ⋮ > **Ajouter à l'écran d'accueil**.
- **Gratuit** : les offres gratuites de Supabase et Vercel suffisent largement pour une usine.
  Un projet Supabase gratuit sans aucune visite pendant 7 jours est mis en pause ;
  il suffit de le relancer d'un clic dans Supabase.

## Pour le développement
Ouvrez `index.html` avec un petit serveur local, par exemple :
```bash
python3 -m http.server 8000
```
puis http://localhost:8000. Toutes les données passent par la table `records`
(colonnes `collection`, `id`, `data` en JSON) ; les comptes autorisés sont dans `membres`.
