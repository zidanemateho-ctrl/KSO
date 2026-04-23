import { ArrowLeft } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import ksoLogo from "../assets/branding/kso-logo.jpeg";
import { Seo } from "../components/seo/Seo";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { Role, StudentLevel, Stream } from "../types/models";

export function RegisterPage() {
  const { user, register } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  // Champs de base
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");

  // Champs pour étudiants
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [level, setLevel] = useState<StudentLevel>("SECONDE");
  const [stream, setStream] = useState<Stream>("SCIENTIFIQUE");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [targetProfession, setTargetProfession] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");
  const [schoolName, setSchoolName] = useState("");

  // Champs pour enseignants
  const [employeeCode, setEmployeeCode] = useState("");
  const [speciality, setSpeciality] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const isHighSchoolStudent = role === "STUDENT";
  const isUniversityStudent = role === "UNIVERSITY_STUDENT";
  const isTeacherRole = role === "TEACHER";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        email,
        password,
        fullName,
        role
      };

      // Ajouter les champs selon le rôle
      if (isHighSchoolStudent) {
        payload.registrationNumber = registrationNumber;
        payload.profileType = "ELEVE";
        payload.level = level;
        payload.stream = stream;
        payload.guardianPhone = guardianPhone;
        payload.targetProfession = targetProfession;
        payload.learningObjectives = learningObjectives;
        payload.schoolName = schoolName;
      }

      if (isUniversityStudent) {
        payload.registrationNumber = registrationNumber;
        payload.profileType = "ETUDIANT";
        payload.level = level;
        payload.stream = stream;
        payload.targetProfession = targetProfession;
        payload.learningObjectives = learningObjectives;
        payload.schoolName = schoolName;
      }

      if (isTeacherRole) {
        payload.employeeCode = employeeCode;
        payload.speciality = speciality;
      }


      await register(payload);
      success("Compte cree", "Bienvenue sur KSO.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de creer le compte";
      setError(message);
      toastError("Erreur d inscription", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <Seo
        title="Inscription | KSO"
        description="Creation de compte KSO pour eleves, etudiants, enseignants et parents."
        path="/register"
        noindex
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(13,182,217,0.16),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(243,164,65,0.2),transparent_30%),linear-gradient(160deg,#e8f0ff_0%,#f4f8ff_60%,#fff6e9_100%)]" />

      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="hidden rounded-3xl border border-slate-200 bg-white/95 p-8 text-slate-900 shadow-[0_28px_48px_-36px_rgba(7,21,41,0.84)] lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <img src={ksoLogo} alt="Logo KSO" className="h-16 w-16 rounded-2xl border border-slate-300 object-cover shadow-sm" />
            <div>
              <p className="font-display text-3xl font-bold text-slate-900">KSO</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Creation de compte</p>
            </div>
          </div>

          <h1 className="mt-6 font-display text-4xl font-bold leading-tight text-slate-900">
            Activez votre profil
            <br />
            en quelques champs.
          </h1>
          <p className="mt-4 text-sm text-slate-600">
            Selectionnez un role, completez les informations essentielles et entrez directement dans le workspace.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Etudiants</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">Parcours academique</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Enseignants</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">Suivi pedagogique</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Parents</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">Suivi et accompagnement</p>
            </article>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mx-auto h-14 w-14 kso-ring" />
            <p className="mt-3 text-center text-sm font-semibold text-slate-800">Modele de profil dynamique actif</p>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white/95 p-7 shadow-[0_28px_48px_-36px_rgba(7,21,41,0.84)]">
          <Link to="/" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour presentation
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <img src={ksoLogo} alt="Logo KSO" className="h-12 w-12 rounded-xl border border-slate-300 object-cover" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-600">Inscription</p>
              <h2 className="font-display text-3xl font-bold text-slate-900">Creer un compte KSO</h2>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-500">Choisissez votre role et remplissez les informations requises.</p>

          {message ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>
          ) : null}

          <div className="mt-5 space-y-4">
            {/* Champs de base */}
            <label className="block text-sm font-medium text-slate-700">
              Rôle
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
                className="mt-1 w-full"
                required
              >
                <option value="TEACHER">Enseignant</option>
                <option value="STUDENT">Élève</option>
                <option value="UNIVERSITY_STUDENT">Étudiant Universitaire</option>
                <option value="PARENT">Parent</option>
              </select>

            </label>

            <label className="block text-sm font-medium text-slate-700">
              Nom complet
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                className="mt-1 w-full"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-1 w-full"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Mot de passe
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                className="mt-1 w-full"
              />
            </label>

            {/* Champs spécifiques aux élèves de lycée */}
            {isHighSchoolStudent && (
              <>
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Informations académiques</h3>

                  <label className="block text-sm font-medium text-slate-700">
                    Établissement
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(event) => setSchoolName(event.target.value)}
                      required
                      className="mt-1 w-full"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700 mt-4">
                    Matricule
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(event) => setRegistrationNumber(event.target.value)}
                      required
                      className="mt-1 w-full"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700 mt-4">
                    Niveau
                    <select
                      value={level}
                      onChange={(event) => setLevel(event.target.value as StudentLevel)}
                      className="mt-1 w-full"
                      required
                    >
                      <option value="">Sélectionnez un niveau</option>
                      <option value="SECONDE">2nde</option>
                      <option value="PREMIERE">1ère</option>
                      <option value="TERMINALE">Tle</option>
                      <option value="LOWER_SIXTH">Lower Sixth</option>
                      <option value="UPPER_SIXTH">Upper Sixth</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700 mt-4">
                    Série
                    <select
                      value={stream}
                      onChange={(event) => setStream(event.target.value as Stream)}
                      className="mt-1 w-full"
                      required
                    >
                      <option value="">Sélectionnez une série</option>
                      <option value="SCIENTIFIQUE">Scientifique</option>
                      <option value="LITTERAIRE">Littéraire</option>
                      <option value="TECHNIQUE">Technique</option>
                      <option value="ECONOMIQUE">Économie</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700 mt-4">
                    Numéro du Tuteur
                    <input
                      type="tel"
                      value={guardianPhone}
                      onChange={(event) => setGuardianPhone(event.target.value)}
                      required
                      className="mt-1 w-full"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700 mt-4">
                    Profession cible
                    <input
                      type="text"
                      value={targetProfession}
                      onChange={(event) => setTargetProfession(event.target.value)}
                      required
                      className="mt-1 w-full"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700 mt-4">
                    Objectif d'apprentissage
                    <textarea
                      value={learningObjectives}
                      onChange={(event) => setLearningObjectives(event.target.value)}
                      required
                      rows={3}
                      className="mt-1 w-full"
                    />
                  </label>
                </div>
              </>
            )}

            {/* Champs spécifiques aux étudiants universitaires */}
            {isUniversityStudent && (
              <>
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Informations académiques</h3>

                  

                  <label className="block text-sm font-medium text-slate-700 mt-4">
                    Établissement
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(event) => setSchoolName(event.target.value)}
                      required
                      className="mt-1 w-full"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700 mt-4">
                    Matricule
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(event) => setRegistrationNumber(event.target.value)}
                      required
                      className="mt-1 w-full"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700 mt-4">
                    Niveau
                    <select
                      value={level}
                      onChange={(event) => setLevel(event.target.value as StudentLevel)}
                      className="mt-1 w-full"
                      required
                    >
                      <option value="">Sélectionnez un niveau</option>
                      <option value="LICENCE_1">Bac+1</option>
                      <option value="LICENCE_2">Bac+2</option>
                      <option value="LICENCE_3">Bac+3</option>
                      <option value="MASTER_1">Bac+4</option>
                      <option value="SECONDE">Licence</option>
                      <option value="PREMIERE">Master 1</option>
                      <option value="TERMINALE">Master 2</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700 mt-4">
                    Filière
                    <select
                      value={stream}
                      onChange={(event) => setStream(event.target.value as Stream)}
                      className="mt-1 w-full"
                      required
                    >
                      <option value="">Sélectionnez une filière</option>
                      <option value="INGENIERIE">Ingénierie</option>
                      <option value="MEDECINE">Médecine</option>
                      <option value="ECONOMIE_GESTION">Économie-Gestion</option>
                      <option value="LANGUE">Langue</option>
                      <option value="DROIT">Droit</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700 mt-4">
                    Profession cible
                    <input
                      type="text"
                      value={targetProfession}
                      onChange={(event) => setTargetProfession(event.target.value)}
                      required
                      className="mt-1 w-full"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700 mt-4">
                    Objectif d'apprentissage
                    <textarea
                      value={learningObjectives}
                      onChange={(event) => setLearningObjectives(event.target.value)}
                      required
                      rows={3}
                      className="mt-1 w-full"
                    />
                  </label>
                </div>
              </>
            )}

            {/* Champs spécifiques aux enseignants */}
            {isTeacherRole && (
              <>
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Informations professionnelles</h3>

                  <label className="block text-sm font-medium text-slate-700">
                    Code employé
                    <input
                      type="text"
                      value={employeeCode}
                      onChange={(event) => setEmployeeCode(event.target.value)}
                      required
                      className="mt-1 w-full"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700 mt-4">
                    Spécialité
                    <input
                      type="text"
                      value={speciality}
                      onChange={(event) => setSpeciality(event.target.value)}
                      className="mt-1 w-full"
                    />
                  </label>
                </div>
              </>
            )}

          </div>

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? "Creation en cours..." : "Creer mon compte"}
          </Button>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <p>Déjà un compte ?</p>
            <Link to="/login" className="font-semibold text-slate-900 hover:text-slate-700">
              Connectez-vous
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
