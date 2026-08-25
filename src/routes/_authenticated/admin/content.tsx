import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, Trash2, Type, ListChecks, MinusCircle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  saveSiteContent,
  deleteSiteContentKey,
  type SiteContentMap,
  type SiteContentValue,
  type JsonValue,
} from "@/lib/site-content.functions";

export const Route = createFileRoute("/_authenticated/admin/content")({
  head: () => ({
    meta: [
      { title: "Site Content Management | Blue Language" },
      {
        name: "description",
        content: "Edit homepage text, site name, and footer in Arabic and English",
      },
    ],
  }),
  component: AdminContentPage,
});

type DraftMap = Record<string, SiteContentValue>;
type ListItem = Record<string, JsonValue>;

const GROUP_LABELS: Record<string, string> = {
  site: "General (Site Name)",
  home: "Homepage",
  footer: "Footer",
  app: "App",
};

function isListValue(v: SiteContentValue | undefined): boolean {
  return !!v && (Array.isArray(v.ar) || Array.isArray(v.en));
}

function isSingleValue(v: SiteContentValue | undefined): boolean {
  return !!v && v.ar === undefined && v.en === undefined && v.value !== undefined;
}

function listFields(v: SiteContentValue): string[] {
  const fields: string[] = [];
  for (const langKey of ["ar", "en"] as const) {
    const arr = v[langKey];
    if (Array.isArray(arr)) {
      for (const item of arr as ListItem[]) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          for (const k of Object.keys(item)) if (!fields.includes(k)) fields.push(k);
        }
      }
    }
  }
  return fields.length ? fields : ["title", "desc"];
}

function AdminContentPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftMap>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newKind, setNewKind] = useState<"text" | "list">("text");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-site-content"],
    queryFn: async (): Promise<SiteContentMap> => {
      const { data, error } = await supabase.from("site_content").select("key, value").order("key");
      if (error) throw error;
      const map: SiteContentMap = {};
      for (const row of data ?? []) map[row.key] = row.value as SiteContentValue;
      return map;
    },
  });

  useEffect(() => {
    if (data) {
      setDraft(JSON.parse(JSON.stringify(data)));
      setDirty(new Set());
    }
  }, [data]);

  const update = (key: string, value: SiteContentValue) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty((s) => new Set(s).add(key));
  };

  const removeKey = async (key: string) => {
    if (!window.confirm(`Permanently delete "${key}"?`)) return;
    try {
      await deleteSiteContentKey({ data: { key } });
      toast.success("Deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-site-content"] });
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Deletion failed");
    }
  };

  const addKey = () => {
    const key = newKey.trim();
    if (!/^[a-z0-9_.-]+$/i.test(key)) {
      toast.error("Key must contain English letters, numbers, or . _ - only");
      return;
    }
    if (draft[key]) {
      toast.error("This key already exists");
      return;
    }
    const value: SiteContentValue =
      newKind === "list" ? { ar: [], en: [] } : { ar: "", en: "" };
    update(key, value);
    setNewKey("");
    toast.success("Added - don't forget to save changes");
  };

  const saveAll = async () => {
    if (!dirty.size) return;
    setSaving(true);
    try {
      const items = Array.from(dirty).map((key) => ({
        key,
        value: draft[key] as Record<string, unknown>,
      }));
      await saveSiteContent({ data: { items } });
      toast.success("All changes saved successfully");
      setDirty(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-site-content"] });
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const groups = useMemo(() => {
    const g: Record<string, string[]> = {};
    for (const key of Object.keys(draft).sort()) {
      const prefix = key.split(".")[0] || "misc";
      (g[prefix] ||= []).push(key);
    }
    return g;
  }, [draft]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="ltr">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Site Content Management</h1>
          <p className="text-sm text-muted-foreground">
            Edit any text appearing on the homepage and site in Arabic and English. Empty lists hide
            the section from the homepage.
          </p>
        </div>
        <Button onClick={saveAll} disabled={!dirty.size || saving} className="font-bold gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes {dirty.size ? `(${dirty.size})` : ""}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Add New Text Key
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3 text-left">
          <div className="space-y-1 flex-1 min-w-[200px]">
            <Label>Key (e.g., home.announcement)</Label>
            <Input
              dir="ltr"
              placeholder="home.announcement"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={newKind === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setNewKind("text")}
            >
              <Type className="h-4 w-4 mr-1" /> Text
            </Button>
            <Button
              type="button"
              variant={newKind === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setNewKind("list")}
            >
              <ListChecks className="h-4 w-4 mr-1" /> List
            </Button>
          </div>
          <Button type="button" onClick={addKey} variant="secondary" className="font-bold">
            Add
          </Button>
        </CardContent>
      </Card>

      {Object.entries(groups).map(([prefix, keys]) => (
        <div key={prefix} className="space-y-4">
          <h2 className="text-xl font-black border-b pb-2">{GROUP_LABELS[prefix] || prefix}</h2>
          {keys.map((key) => {
            const value = draft[key];
            if (!value) return null;
            const isDirty = dirty.has(key);
            return (
              <Card key={key} className={isDirty ? "border-primary/50" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold" dir="ltr">
                      {key}
                    </CardTitle>
                    {isDirty && <Badge variant="secondary">Modified</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeKey(key)} title="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {isListValue(value) ? (
                    <ListValueEditor value={value} onChange={(v) => update(key, v)} />
                  ) : isSingleValue(value) ? (
                    <Input
                      dir="ltr"
                      value={typeof value.value === "string" ? value.value : String(value.value ?? "")}
                      onChange={(e) => update(key, { value: e.target.value })}
                    />
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Arabic</Label>
                        <Textarea
                          dir="ltr"
                          rows={2}
                          value={typeof value?.ar === "string" ? value.ar : ""}
                          onChange={(e) => update(key, { ...value, ar: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>English</Label>
                        <Textarea
                          dir="ltr"
                          rows={2}
                          value={typeof value?.en === "string" ? value.en : ""}
                          onChange={(e) => update(key, { ...value, en: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ListValueEditor({
  value,
  onChange,
}: {
  value: SiteContentValue;
  onChange: (v: SiteContentValue) => void;
}) {
  const [tab, setTab] = useState<"ar" | "en">("ar");
  const fields = listFields(value);
  const items: ListItem[] = Array.isArray(value[tab]) ? (value[tab] as ListItem[]) : [];

  const setItems = (next: ListItem[]) => onChange({ ...value, [tab]: next });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={tab === "ar" ? "default" : "outline"}
          onClick={() => setTab("ar")}
        >
          Arabic
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "en" ? "default" : "outline"}
          onClick={() => setTab("en")}
        >
          English
        </Button>
        <span className="text-xs text-muted-foreground">
          {items.length} items — leave list empty to hide section from page
        </span>
      </div>

      {items.map((item, idx) => (
        <div key={idx} className="border rounded-xl p-4 space-y-3 relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 left-2"
            onClick={() => setItems(items.filter((_, i) => i !== idx))}
            title="Delete Item"
          >
            <MinusCircle className="h-4 w-4 text-destructive" />
          </Button>
          {fields.map((field) => (
            <div key={field} className="space-y-1">
              <Label className="text-xs" dir="ltr">
                {field}
              </Label>
              {field === "icon" ? (
                <Input
                  dir="ltr"
                  placeholder="Book / Star / Award / Globe / GraduationCap / Briefcase / MessageCircle"
                  value={typeof item[field] === "string" ? (item[field] as string) : ""}
                  onChange={(e) =>
                    setItems(items.map((it, i) => (i === idx ? { ...it, [field]: e.target.value } : it)))
                  }
                />
              ) : (
                <Textarea
                  dir={tab === "ar" ? "rtl" : "ltr"}
                  rows={field === "title" || field === "q" ? 1 : 2}
                  value={typeof item[field] === "string" ? (item[field] as string) : ""}
                  onChange={(e) =>
                    setItems(items.map((it, i) => (i === idx ? { ...it, [field]: e.target.value } : it)))
                  }
                />
              )}
            </div>
          ))}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="font-bold"
        onClick={() => setItems([...items, Object.fromEntries(fields.map((f) => [f, ""]))])}
      >
        <Plus className="h-4 w-4 mr-1" /> Add Item
      </Button>
    </div>
  );
}
