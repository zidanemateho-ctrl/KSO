# Backend KSO

API Express + Prisma pour la plateforme SaaS academique et d accompagnement.
Mode developpement: SQLite (`DATABASE_URL="file:./dev.db"`).

## Points cle backend

- Roles separes: admin college/lycee/universite, eleve, etudiant, parent, enseignant
- Notes par semestre + sequence
- Edition des notes avec recalcul automatique des classements
- Analytics enseignant (multi-classes) + analytics etablissement
- Orientation explicable + alertes de risque academique
- Simulateur what-if (projection moyenne/rang/risque)
- Module accompagnement: plans d actions + alertes manuelles/lecture
- Module guidance avance:
  - taches/collaborateurs de plan
  - assiduite/comportement/competences
  - opportunites (metiers, filieres, bourses, concours) + matching
  - stages/alternance, mentorat, journal hebdo, portfolio
  - bien-etre, badges, alumni, sync externe de notes
- Groupes de chat inter-etablissements par profil/niveau/filiere

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`

## Variables

Voir `backend/.env.example`.

## Schema Prisma

Le schema complet est dans `prisma/schema.prisma`.

`npm run prisma:migrate` execute `prisma/migrations/20260409002000_init_sqlite/migration.sql` (script idempotent en mode dev).
