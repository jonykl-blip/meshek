"use client";

import { useState, useTransition, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createWorkType,
  updateWorkType,
  archiveWorkType,
  type WorkType,
} from "@/app/actions/work-types";
import { WORK_TYPE_CATEGORIES } from "@/lib/constants";
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

type ActiveFilter = "all" | "active" | "inactive";

interface Labels {
  addWorkType: string;
  editWorkType: string;
  archiveWorkType: string;
  nameHe: string;
  nameEn: string;
  nameTh: string;
  category: string;
  isActive: string;
  active: string;
  inactive: string;
  archiveConfirm: string;
  archiveDescription: string;
  archiveLinkedWarning: string;
  confirm: string;
  cancel: string;
  save: string;
  saving: string;
  created: string;
  updated: string;
  archived: string;
  noWorkTypes: string;
  actions: string;
  search: string;
  allCategories: string;
  showAll: string;
  activeOnly: string;
  inactiveOnly: string;
  categoryFieldWork: string;
  categorySpraying: string;
  categoryPlanting: string;
  categoryHarvest: string;
  categoryIrrigation: string;
  categoryMaintenance: string;
  categoryLogistics: string;
  categoryAdmin: string;
  categoryOther: string;
  validationNameRequired: string;
  validationCategoryRequired: string;
}

const CATEGORY_LABEL_MAP: Record<string, keyof Labels> = {
  field_work: "categoryFieldWork",
  spraying: "categorySpraying",
  planting: "categoryPlanting",
  harvest: "categoryHarvest",
  irrigation: "categoryIrrigation",
  maintenance: "categoryMaintenance",
  logistics: "categoryLogistics",
  admin: "categoryAdmin",
  other: "categoryOther",
};

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  field_work: "bg-blue-100 text-blue-800",
  spraying: "bg-orange-100 text-orange-800",
  planting: "bg-green-100 text-green-800",
  harvest: "bg-yellow-100 text-yellow-800",
  irrigation: "bg-cyan-100 text-cyan-800",
  maintenance: "bg-purple-100 text-purple-800",
  logistics: "bg-gray-100 text-gray-800",
  admin: "bg-gray-200 text-gray-600",
  other: "bg-gray-100 text-gray-600",
};

function getCategoryLabel(category: string, labels: Labels): string {
  const key = CATEGORY_LABEL_MAP[category];
  return key ? labels[key] : category;
}

function CategoryBadge({ category, labels }: { category: string; labels: Labels }) {
  const classes = CATEGORY_BADGE_CLASSES[category] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {getCategoryLabel(category, labels)}
    </span>
  );
}

export function WorkTypesTable({
  workTypes,
  labels,
}: {
  workTypes: WorkType[];
  labels: Labels;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const router = useRouter();

  const showFeedback = useCallback((msg: string) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedbackMsg(msg);
    feedbackTimer.current = setTimeout(() => setFeedbackMsg(""), 3000);
  }, []);

  const filteredWorkTypes = useMemo(() => {
    return workTypes.filter((wt) => {
      if (activeFilter === "active" && !wt.is_active) return false;
      if (activeFilter === "inactive" && wt.is_active) return false;

      if (categoryFilter && wt.category !== categoryFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = wt.name_he.toLowerCase().includes(q);
        const matchEn = wt.name_en?.toLowerCase().includes(q);
        const matchCategory = getCategoryLabel(wt.category, labels).toLowerCase().includes(q);
        if (!matchName && !matchEn && !matchCategory) return false;
      }

      return true;
    });
  }, [workTypes, searchQuery, categoryFilter, activeFilter, labels]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          {labels.addWorkType}
        </Button>
        {feedbackMsg && (
          <span className="text-sm text-green-600">{feedbackMsg}</span>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder={labels.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-[220px]"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">{labels.allCategories}</option>
          {WORK_TYPE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {getCategoryLabel(cat, labels)}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">{labels.showAll}</option>
          <option value="active">{labels.activeOnly}</option>
          <option value="inactive">{labels.inactiveOnly}</option>
        </select>
      </div>

      {showCreateForm && (
        <CreateWorkTypeForm
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
              <th className="px-4 py-3 text-start font-medium">{labels.isActive}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkTypes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {labels.noWorkTypes}
                </td>
              </tr>
            ) : (
              filteredWorkTypes.map((item) => (
                <WorkTypeRow
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

function CreateWorkTypeForm({
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
  const [nameTh, setNameTh] = useState("");
  const [category, setCategory] = useState("");
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
      const result = await createWorkType({
        name_he: nameHe.trim(),
        name_en: nameEn.trim() || undefined,
        name_th: nameTh.trim() || undefined,
        category,
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
          <Label>{labels.nameTh}</Label>
          <Input
            value={nameTh}
            onChange={(e) => setNameTh(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>{labels.category}</Label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{labels.allCategories}</option>
            {WORK_TYPE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {getCategoryLabel(cat, labels)}
              </option>
            ))}
          </select>
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

function WorkTypeRow({
  item,
  labels,
  onFeedback,
}: {
  item: WorkType;
  labels: Labels;
  onFeedback: (msg: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [editNameHe, setEditNameHe] = useState(item.name_he);
  const [editNameEn, setEditNameEn] = useState(item.name_en ?? "");
  const [editNameTh, setEditNameTh] = useState(item.name_th ?? "");
  const [editCategory, setEditCategory] = useState(item.category);
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
      const result = await updateWorkType(item.id, {
        name_he: editNameHe.trim(),
        name_en: editNameEn.trim() || undefined,
        name_th: editNameTh.trim() || undefined,
        category: editCategory,
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
    setEditNameTh(item.name_th ?? "");
    setEditCategory(item.category);
    setError("");
    setIsEditing(false);
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveWorkType(item.id);
      if (result.success) {
        setShowArchiveDialog(false);
        onFeedback(labels.archived);
      } else {
        setError(result.error);
        setShowArchiveDialog(false);
      }
    });
  }

  const inactiveClasses = !item.is_active ? "opacity-50" : "";

  if (isEditing) {
    return (
      <tr className="border-b last:border-b-0 bg-muted/20">
        <td className="px-4 py-3" colSpan={5}>
          <div className="max-w-md space-y-3">
            <div>
              <Label>{labels.nameHe}</Label>
              <Input
                value={editNameHe}
                onChange={(e) => setEditNameHe(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{labels.nameEn}</Label>
              <Input
                value={editNameEn}
                onChange={(e) => setEditNameEn(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{labels.nameTh}</Label>
              <Input
                value={editNameTh}
                onChange={(e) => setEditNameTh(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{labels.category}</Label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {WORK_TYPE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat, labels)}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                {isPending ? labels.saving : labels.save}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={isPending}>
                {labels.cancel}
              </Button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className={`border-b last:border-b-0 transition-colors hover:bg-muted/30 ${inactiveClasses}`}>
        <td className="px-4 py-3 text-base font-semibold">{item.name_he}</td>
        <td className="px-4 py-3 text-muted-foreground">{item.name_en ?? ""}</td>
        <td className="px-4 py-3">
          <CategoryBadge category={item.category} labels={labels} />
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              item.is_active ? "bg-green-500" : "bg-gray-300"
            }`}
            title={item.is_active ? labels.active : labels.inactive}
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              {labels.editWorkType}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowArchiveDialog(true)}
            >
              {labels.archiveWorkType}
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
            <DialogDescription>
              {labels.archiveDescription}
              <br />
              <span className="mt-1 block text-xs text-orange-600">
                {labels.archiveLinkedWarning}
              </span>
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-red-600">{error}</p>}
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
