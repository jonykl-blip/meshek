"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createMaterial,
  updateMaterial,
  archiveMaterial,
  type Material,
} from "@/app/actions/materials";
import { MATERIAL_CATEGORIES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Labels {
  addMaterial: string;
  editMaterial: string;
  archiveMaterial: string;
  nameHe: string;
  nameEn: string;
  category: string;
  defaultUnit: string;
  archiveConfirm: string;
  archiveDescription: string;
  confirm: string;
  cancel: string;
  save: string;
  saving: string;
  created: string;
  updated: string;
  archived: string;
  noMaterials: string;
  actions: string;
  search: string;
  allCategories: string;
  categorySpray: string;
  categorySeed: string;
  categoryFertilizer: string;
  categoryOther: string;
  validationNameRequired: string;
  validationCategoryRequired: string;
}

type CategoryKey = (typeof MATERIAL_CATEGORIES)[number];

const CATEGORY_BADGE_CLASSES: Record<CategoryKey, string> = {
  spray: "bg-orange-100 text-orange-800",
  seed: "bg-green-100 text-green-800",
  fertilizer: "bg-amber-100 text-amber-800",
  other: "bg-gray-100 text-gray-600",
};

function getCategoryLabel(category: string, labels: Labels): string {
  const map: Record<string, string> = {
    spray: labels.categorySpray,
    seed: labels.categorySeed,
    fertilizer: labels.categoryFertilizer,
    other: labels.categoryOther,
  };
  return map[category] ?? category;
}

function CategoryBadge({ category, labels }: { category: string; labels: Labels }) {
  const classes = CATEGORY_BADGE_CLASSES[category as CategoryKey] ?? CATEGORY_BADGE_CLASSES.other;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {getCategoryLabel(category, labels)}
    </span>
  );
}

export function MaterialsTable({
  materials,
  labels,
}: {
  materials: Material[];
  labels: Labels;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const router = useRouter();

  const showFeedback = useCallback((msg: string) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedbackMsg(msg);
    feedbackTimer.current = setTimeout(() => setFeedbackMsg(""), 3000);
  }, []);

  const filtered = materials.filter((m) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      m.name_he.toLowerCase().includes(q) ||
      (m.name_en && m.name_en.toLowerCase().includes(q));
    const matchesCategory = !categoryFilter || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          {labels.addMaterial}
        </Button>

        <Input
          placeholder={labels.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-[220px]"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{labels.allCategories}</option>
          {MATERIAL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {getCategoryLabel(cat, labels)}
            </option>
          ))}
        </select>

        {feedbackMsg && (
          <span className="text-sm text-green-600">{feedbackMsg}</span>
        )}
      </div>

      {showCreateForm && (
        <CreateMaterialForm
          labels={labels}
          onClose={() => setShowCreateForm(false)}
          onSuccess={(msg) => {
            setShowCreateForm(false);
            showFeedback(msg);
            router.refresh();
          }}
        />
      )}

      <div className="overflow-x-auto rounded-lg border shadow-md bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-start font-medium">{labels.nameHe}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.nameEn}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.category}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.defaultUnit}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {labels.noMaterials}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <MaterialRow
                  key={item.id}
                  item={item}
                  labels={labels}
                  onFeedback={(msg) => {
                    showFeedback(msg);
                    router.refresh();
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateMaterialForm({
  labels,
  onClose,
  onSuccess,
}: {
  labels: Labels;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [nameHe, setNameHe] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [category, setCategory] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError("");
    if (!nameHe.trim()) {
      setError(labels.validationNameRequired);
      return;
    }
    if (!category) {
      setError(labels.validationCategoryRequired);
      return;
    }
    startTransition(async () => {
      const result = await createMaterial({
        name_he: nameHe.trim(),
        name_en: nameEn.trim() || undefined,
        category,
        default_unit: defaultUnit.trim() || undefined,
      });
      if (result.success) {
        onSuccess(labels.created);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mb-6 max-w-md rounded-lg border bg-card p-4 shadow-sm">
      <div className="space-y-4">
        <div>
          <Label>{labels.nameHe}</Label>
          <Input
            value={nameHe}
            onChange={(e) => setNameHe(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label>{labels.nameEn}</Label>
          <Input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label>{labels.category}</Label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">{labels.allCategories}</option>
            {MATERIAL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {getCategoryLabel(cat, labels)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>{labels.defaultUnit}</Label>
          <Input
            value={defaultUnit}
            onChange={(e) => setDefaultUnit(e.target.value)}
            className="mt-1"
            placeholder={'e.g. \u05DC\u05D9\u05D8\u05E8, \u05E7"\u05D2, \u05D8\u05D5\u05DF, \u05DE"\u05E7'}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? labels.saving : labels.save}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {labels.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MaterialRow({
  item,
  labels,
  onFeedback,
}: {
  item: Material;
  labels: Labels;
  onFeedback: (msg: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [editNameHe, setEditNameHe] = useState(item.name_he);
  const [editNameEn, setEditNameEn] = useState(item.name_en ?? "");
  const [editCategory, setEditCategory] = useState(item.category);
  const [editDefaultUnit, setEditDefaultUnit] = useState(item.default_unit ?? "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError("");
    if (!editNameHe.trim()) {
      setError(labels.validationNameRequired);
      return;
    }
    if (!editCategory) {
      setError(labels.validationCategoryRequired);
      return;
    }
    startTransition(async () => {
      const result = await updateMaterial(item.id, {
        name_he: editNameHe.trim(),
        name_en: editNameEn.trim() || undefined,
        category: editCategory,
        default_unit: editDefaultUnit.trim() || undefined,
      });
      if (result.success) {
        setIsEditing(false);
        onFeedback(labels.updated);
      } else {
        setError(result.error);
      }
    });
  }

  function handleCancelEdit() {
    setEditNameHe(item.name_he);
    setEditNameEn(item.name_en ?? "");
    setEditCategory(item.category);
    setEditDefaultUnit(item.default_unit ?? "");
    setError("");
    setIsEditing(false);
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveMaterial(item.id);
      if (result.success) {
        setShowArchiveDialog(false);
        onFeedback(labels.archived);
      } else {
        setError(result.error);
        setShowArchiveDialog(false);
      }
    });
  }

  if (isEditing) {
    return (
      <tr className="border-b last:border-b-0 bg-muted/20">
        <td className="px-4 py-3">
          <Input
            value={editNameHe}
            onChange={(e) => setEditNameHe(e.target.value)}
            className="max-w-[200px]"
          />
        </td>
        <td className="px-4 py-3">
          <Input
            value={editNameEn}
            onChange={(e) => setEditNameEn(e.target.value)}
            className="max-w-[200px]"
          />
        </td>
        <td className="px-4 py-3">
          <select
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {MATERIAL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {getCategoryLabel(cat, labels)}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <Input
            value={editDefaultUnit}
            onChange={(e) => setEditDefaultUnit(e.target.value)}
            className="max-w-[120px]"
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                {isPending ? labels.saving : labels.save}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={isPending}>
                {labels.cancel}
              </Button>
            </div>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className="border-b last:border-b-0 transition-colors hover:bg-muted/30">
        <td className="px-4 py-3 text-base font-semibold">{item.name_he}</td>
        <td className="px-4 py-3 text-muted-foreground">{item.name_en ?? ""}</td>
        <td className="px-4 py-3">
          <CategoryBadge category={item.category} labels={labels} />
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{item.default_unit ?? ""}</td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              {labels.editMaterial}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowArchiveDialog(true)}
            >
              {labels.archiveMaterial}
            </Button>
          </div>
        </td>
      </tr>
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {labels.archiveConfirm.replace("__NAME__", item.name_he)}
            </DialogTitle>
            <DialogDescription>{labels.archiveDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
              disabled={isPending}
            >
              {labels.cancel}
            </Button>
            <Button variant="destructive" onClick={handleArchive} disabled={isPending}>
              {isPending ? labels.saving : labels.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
