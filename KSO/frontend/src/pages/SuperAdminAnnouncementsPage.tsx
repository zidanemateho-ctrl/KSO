import { CalendarClock, Megaphone, Send } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { schoolApi, superAdminApi } from "../api/services";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { Pagination } from "../components/ui/Pagination";
import { useToast } from "../hooks/useToast";
import { Announcement, School } from "../types/models";
import { formatDate } from "../utils/format";

const pageSize = 10;

const initialForm = {
  title: "",
  content: "",
  startsAt: "",
  endsAt: "",
  targetSchoolId: "",
  isPublished: true
};

export function SuperAdminAnnouncementsPage() {
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(initialForm);

  async function loadData(currentPage = page) {
    setLoading(true);
    setError(null);

    try {
      const [announcementsData, schoolsData] = await Promise.all([
        superAdminApi.listAnnouncements({
          page: currentPage,
          pageSize
        }),
        schoolApi.list()
      ]);

      setAnnouncements(announcementsData.items);
      setTotal(announcementsData.total);
      setSchools(schoolsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les annonces");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await superAdminApi.createAnnouncement({
        title: form.title,
        content: form.content,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        targetSchoolId: form.targetSchoolId || undefined,
        isPublished: form.isPublished
      });

      setForm(initialForm);
      success("Annonce publiee", "L annonce est visible par les etablissements cibles.");
      await loadData(1);
      setPage(1);
    } catch (err) {
      showError("Publication impossible", err instanceof Error ? err.message : "Erreur lors de la publication.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <Card title="Nouvelle annonce groupe" subtitle="Informer les ecoles/universites des prochaines activites">
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
          <input
            placeholder="Titre de l annonce"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <select
            value={form.targetSchoolId}
            onChange={(event) => setForm((prev) => ({ ...prev, targetSchoolId: event.target.value }))}
          >
            <option value="">Tous les etablissements</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name} ({school.code})
              </option>
            ))}
          </select>

          <textarea
            className="md:col-span-2 min-h-24"
            placeholder="Contenu de l annonce..."
            value={form.content}
            onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            required
          />

          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Debut
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
            />
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Fin
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
            />
          </label>

          <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(event) => setForm((prev) => ({ ...prev, isPublished: event.target.checked }))}
            />
            Publier immediatement
          </label>

          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              <Send className="h-4 w-4" />
              {saving ? "Publication..." : "Publier annonce"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Historique des annonces">
        {loading ? (
          <Loader label="Chargement des annonces..." />
        ) : announcements.length === 0 ? (
          <EmptyState title="Aucune annonce" description="Publie ta premiere annonce de groupe." />
        ) : (
          <>
            <div className="space-y-3">
              {announcements.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-slate-500" />
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${
                        item.isPublished
                          ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                          : "border-amber-200 bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.isPublished ? "Publiee" : "Brouillon"}
                    </span>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.content}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Creee le {formatDate(item.createdAt)}
                    </span>
                    <span>Cible: {item.targetSchool?.name || "Tous les etablissements"}</span>
                    {item.startsAt ? <span>Debut: {formatDate(item.startsAt)}</span> : null}
                    {item.endsAt ? <span>Fin: {formatDate(item.endsAt)}</span> : null}
                  </div>
                </article>
              ))}
            </div>
            <Pagination page={page} totalItems={total} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
