# Lot 14 : la liste d'attente

6 novembre 2026. Décisions du porteur le même jour ; les choix de l'agent sont marqués [choix de l'agent].

## 1. Pourquoi

Avant le lancement, chaque vidéo (TikTok, Facebook) et chaque message aux grossistes mène à une seule action : réserver sa place. Le porteur veut des contacts (WhatsApp ou e-mail) de vendeurs intéressés, pour les rappeler, recueillir leurs retours et ouvrir l'accès par vagues.

**Réussi si :** une personne qui arrive d'une vidéo laisse son contact en moins de 30 secondes sur son téléphone, et le porteur retrouve ce contact, avec la vidéo d'où il vient, dans le support-admin.

**Raté si, même en marchant :**
- le formulaire paraît long ou technique ;
- un numéro se retrouve dans un journal ;
- des robots remplissent la liste ;
- l'app de ceux qui l'utilisent déjà s'arrête.

## 2. La page `/liste-attente`

Publique, indexée, dans le plan du site. Elle reprend le style du site (lot 12 : `landing.css`, le menu, le pied de page). Dans l'ordre :

1. **L'accroche** : une phrase, une sous-phrase, puis le formulaire tout de suite sur téléphone (sous l'accroche) et à droite sur ordinateur.
2. **La vidéo de présentation** : le composant `Film` du lot 12 ; son affiche tant que la vidéo n'est pas prête.
3. **Trois bénéfices** : savoir qui veut acheter avant de commander, un lien qui marche dans une chaîne WhatsApp, sur TikTok et en live, les acheteurs prêts avec leur WhatsApp.
4. **Le rappel du formulaire** : un bouton qui remonte au formulaire.

**Le compteur** « N vendeurs ont déjà réservé leur place » ne s'affiche qu'à partir de 50 inscrits [choix de l'agent] : un petit nombre fait fuir. C'est le vrai nombre, jamais un chiffre inventé.

## 3. Le formulaire

- **Prénom** (obligatoire, 40 caractères au plus).
- **WhatsApp ou e-mail** : au moins l'un des deux, les deux possibles.
  - Le WhatsApp a le choix du pays. Le Bénin est proposé en premier [choix de l'agent, la liste des 52 grossistes est au Bénin].
  - Le numéro est vérifié et rangé au format international sur le serveur (`normalizePhone`).
- **Où vends-tu ?** (facultatif, plusieurs choix) : chaîne WhatsApp, groupe WhatsApp, TikTok, Facebook, Instagram, boutique physique.
- **L'accord** (case obligatoire) : « J'accepte que Tamani me contacte sur WhatsApp ou par e-mail pour le lancement. »
- **Un champ caché** pour les robots, comme la fenêtre client (lot 3).

**Après l'envoi :**
- « Ta place est réservée, [prénom] ! Tu es n° N. » N est le rang d'inscription.
- Le bouton « Inviter une vendeuse sur WhatsApp » ouvre WhatsApp avec un message et le lien de la page (`?src=parrainage`).
- Le lien du groupe WhatsApp de la communauté, s'il existe.

**Déjà inscrit** (même WhatsApp ou même e-mail) : la même réponse, avec son rang d'origine. Pas d'erreur, pas de doublon [choix de l'agent].

## 4. D'où vient chaque inscrit

Le paramètre `src` de l'adresse (par exemple `?src=tiktok-j01`, `?src=dm`) est gardé avec l'inscription. Il est limité à 40 caractères, lettres, chiffres et tirets. La revue de chaque semaine compare les vidéos.

## 5. Le site pendant la liste d'attente

- Tous les boutons qui mènent à l'inscription (`/signup`) mènent à `/liste-attente` et disent « Réserver ma place ». Cela vaut pour :
  - l'accueil ;
  - le menu et le tiroir ;
  - la barre du bas ;
  - les cartes de `/forfaits` ;
  - le pied de page.
- Une seule constante commande cette adresse [choix de l'agent] : au lancement, une ligne la remet sur `/signup`.
- **Ce qui ne change pas :**
  - l'inscription reste ouverte par son lien direct (`/signup`), pour le porteur et les testeurs ;
  - la connexion reste visible ;
  - l'app ne change pas.

## 6. Le support-admin

- **La page « Liste d'attente »** (`/support-admin/liste-attente`, lecture `ADMIN`) montre :
  - le total et le nombre d'inscrits de la semaine ;
  - la répartition par source ;
  - la liste : rang, prénom, WhatsApp, e-mail, où il vend, source, date.
  Les admins voient les contacts en entier : c'est le but de la liste.
- **L'export en tableur** (CSV pour Excel, le format du lot 6) : `GET /api/admin/waitlist/export`.
- Une entrée « Liste d'attente » dans le menu du support-admin.

## 7. Les règles

- **Route publique** `POST /api/public/waitlist` :
  - sans CSRF, avec la limite publique (`enforcePublicRateLimit`) et le runtime Node, comme le vérifie `public-routes.test.ts` ;
  - erreurs : `VALIDATION_FAILED`, `INVALID_PHONE`, `RATE_LIMITED`.
- **La confidentialité :**
  - jamais de numéro, d'e-mail ou de prénom dans un journal ;
  - l'e-mail est rangé en minuscules ;
  - on ne garde ni l'adresse IP ni l'appareil.
- **La base :** une table `WaitlistEntry`, avec la migration `9j_waitlist`. Le WhatsApp et l'e-mail sont chacun uniques quand ils sont remplis.
- **Les mots :** du français simple, sans tiret long, en tutoyant comme le site.

## 8. Hors du lot

- Un e-mail de confirmation, et l'envoi des vagues d'accès.
- La liste d'attente dans le fil des notifications du lot 13a.
- Le nom de domaine.
