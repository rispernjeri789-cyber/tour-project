import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { listAdminTours, createTour, updateTour } from "@/lib/api/admin";
import { listParks } from "@/lib/api/tours";
import { formatKes } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/tours")({
  component: AdminTours,
});

const STATUS_OPTIONS = ["draft", "active", "inactive"];
const STATUS_BADGE = { active: "default", draft: "secondary", inactive: "outline" };

const NO_PARK = "__none__";

const PRICING_UNIT_OPTIONS = [
  { value: "per_person", label: "Per person (adult/child)" },
  { value: "per_day", label: "Per day (flat vehicle + driver rate)" },
];

function emptyForm() {
  return {
    title: "",
    park_id: NO_PARK,
    tour_type: "",
    duration_days: "",
    duration_nights: "",
    pricing_unit: "per_person",
    price_per_adult: "",
    price_per_child: "",
    high_season_price_per_adult: "",
    high_season_price_per_child: "",
    max_travelers: "",
    includes: "",
    excludes: "",
    images: "",
    status: "draft",
  };
}

function tourToForm(tour) {
  return {
    title: tour.title || "",
    park_id: tour.park_id || NO_PARK,
    tour_type: tour.tour_type || "",
    duration_days: tour.duration_days ?? "",
    duration_nights: tour.duration_nights ?? "",
    pricing_unit: tour.pricing_unit || "per_person",
    price_per_adult: tour.price_per_adult ?? "",
    price_per_child: tour.price_per_child ?? "",
    high_season_price_per_adult: tour.high_season_price_per_adult ?? "",
    high_season_price_per_child: tour.high_season_price_per_child ?? "",
    max_travelers: tour.max_travelers ?? "",
    includes: (tour.includes || []).join(", "),
    excludes: (tour.excludes || []).join(", "),
    images: (tour.images || []).join(", "),
    status: tour.status || "draft",
  };
}

function formToPayload(form) {
  const toList = (s) =>
    s
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  const toIntOrNull = (v) => (v === "" ? null : parseInt(v, 10));
  const toNumberOrNull = (v) => (v === "" ? null : Number(v));

  return {
    title: form.title.trim(),
    park_id: form.park_id === NO_PARK ? null : form.park_id,
    tour_type: form.tour_type.trim() || null,
    duration_days: toIntOrNull(form.duration_days),
    duration_nights: toIntOrNull(form.duration_nights),
    pricing_unit: form.pricing_unit,
    price_per_adult: form.price_per_adult === "" ? 0 : Number(form.price_per_adult),
    price_per_child:
      form.pricing_unit === "per_day"
        ? form.price_per_adult === ""
          ? 0
          : Number(form.price_per_adult)
        : form.price_per_child === ""
          ? 0
          : Number(form.price_per_child),
    high_season_price_per_adult: toNumberOrNull(form.high_season_price_per_adult),
    high_season_price_per_child:
      form.pricing_unit === "per_day"
        ? toNumberOrNull(form.high_season_price_per_adult)
        : toNumberOrNull(form.high_season_price_per_child),
    max_travelers: toIntOrNull(form.max_travelers),
    includes: toList(form.includes),
    excludes: toList(form.excludes),
    images: toList(form.images),
    status: form.status,
  };
}

function AdminTours() {
  const queryClient = useQueryClient();
  const [editingTour, setEditingTour] = useState(null); // null = closed, {} = new, tour = editing
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");

  const {
    data: tours,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "tours"],
    queryFn: listAdminTours,
  });

  const { data: parks } = useQuery({
    queryKey: ["parks"],
    queryFn: listParks,
  });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editingTour?.id ? updateTour(editingTour.id, payload) : createTour(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tours"] });
      closeDialog();
    },
    onError: (err) => setFormError(err.message || "Failed to save tour"),
  });

  const openCreate = () => {
    setEditingTour({});
    setForm(emptyForm());
    setFormError("");
  };

  const openEdit = (tour) => {
    setEditingTour(tour);
    setForm(tourToForm(tour));
    setFormError("");
  };

  const closeDialog = () => {
    setEditingTour(null);
    setFormError("");
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError("Title is required");
      return;
    }
    setFormError("");
    saveMutation.mutate(formToPayload(form));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Tours</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage the tours customers can book.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New tour
        </Button>
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading tours…</p>}
      {isError && <p className="mt-8 text-red-600">Failed to load tours: {error.message}</p>}

      {tours && (
        <div className="mt-6 rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Park</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tours.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No tours yet. Create your first one.
                  </TableCell>
                </TableRow>
              ) : (
                tours.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>{t.park_name || "—"}</TableCell>
                    <TableCell>{t.tour_type || "—"}</TableCell>
                    <TableCell>
                      {formatKes(t.price_per_adult)}
                      {t.pricing_unit === "per_day" ? " / day" : " / adult"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[t.status] || "outline"}>{t.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => openEdit(t)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editingTour !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTour?.id ? "Edit tour" : "New tour"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="park">Park</Label>
                <Select
                  value={form.park_id}
                  onValueChange={(v) => setForm({ ...form, park_id: v })}
                >
                  <SelectTrigger id="park">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARK}>No park</SelectItem>
                    {(parks || []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tour_type">Tour type</Label>
                <Input
                  id="tour_type"
                  placeholder="e.g. safari, beach"
                  value={form.tour_type}
                  onChange={(e) => setForm({ ...form, tour_type: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration_days">Days</Label>
                <Input
                  id="duration_days"
                  type="number"
                  min="0"
                  value={form.duration_days}
                  onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="duration_nights">Nights</Label>
                <Input
                  id="duration_nights"
                  type="number"
                  min="0"
                  value={form.duration_nights}
                  onChange={(e) => setForm({ ...form, duration_nights: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pricing_unit">Pricing model</Label>
              <Select
                value={form.pricing_unit}
                onValueChange={(v) => setForm({ ...form, pricing_unit: v })}
              >
                <SelectTrigger id="pricing_unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICING_UNIT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                {form.pricing_unit === "per_day"
                  ? "Price / adult below is charged once per day of the trip, regardless of headcount (e.g. self-drive vehicle + driver hire). Customers pay their own accommodation and park entry fees."
                  : "Price / adult and / child are charged per traveler for the whole trip."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price_per_adult">
                  {form.pricing_unit === "per_day" ? "Price / day" : "Price / adult"}
                </Label>
                <Input
                  id="price_per_adult"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price_per_adult}
                  onChange={(e) => setForm({ ...form, price_per_adult: e.target.value })}
                />
              </div>
              {form.pricing_unit !== "per_day" && (
                <div>
                  <Label htmlFor="price_per_child">Price / child</Label>
                  <Input
                    id="price_per_child"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price_per_child}
                    onChange={(e) => setForm({ ...form, price_per_child: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="high_season_price_per_adult">
                  High season price {form.pricing_unit === "per_day" ? "/ day" : "/ adult"}
                </Label>
                <Input
                  id="high_season_price_per_adult"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional — leave blank for no surge"
                  value={form.high_season_price_per_adult}
                  onChange={(e) =>
                    setForm({ ...form, high_season_price_per_adult: e.target.value })
                  }
                />
              </div>
              {form.pricing_unit !== "per_day" && (
                <div>
                  <Label htmlFor="high_season_price_per_child">High season price / child</Label>
                  <Input
                    id="high_season_price_per_child"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Optional — leave blank for no surge"
                    value={form.high_season_price_per_child}
                    onChange={(e) =>
                      setForm({ ...form, high_season_price_per_child: e.target.value })
                    }
                  />
                </div>
              )}
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              High season applies in January, July, August and December. Leave blank if this tour
              doesn&apos;t change price by season.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_travelers">Max travelers</Label>
                <Input
                  id="max_travelers"
                  type="number"
                  min="0"
                  value={form.max_travelers}
                  onChange={(e) => setForm({ ...form, max_travelers: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="includes">Includes (comma-separated)</Label>
              <Input
                id="includes"
                value={form.includes}
                onChange={(e) => setForm({ ...form, includes: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="excludes">Excludes (comma-separated)</Label>
              <Input
                id="excludes"
                value={form.excludes}
                onChange={(e) => setForm({ ...form, excludes: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="images">Image URLs (comma-separated)</Label>
              <Input
                id="images"
                value={form.images}
                onChange={(e) => setForm({ ...form, images: e.target.value })}
              />
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save tour"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
