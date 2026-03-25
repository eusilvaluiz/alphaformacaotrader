import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/Header";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, BookOpen, GripVertical, Eye, EyeOff, Upload, Youtube, X } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type LessonInsert = Database["public"]["Tables"]["lessons"]["Insert"];

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getYoutubeThumbnail(videoUrl: string): string | null {
  const id = extractYoutubeId(videoUrl);
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
}

const Admin = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"lessons" | "members">("lessons");
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/");
  }, [isAdmin, loading, navigate]);

  const { data: lessons } = useQuery({
    queryKey: ["admin-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as Lesson[];
    },
    enabled: isAdmin,
  });

  const { data: members } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;

      const rolesMap = new Map<string, { role: string }[]>();
      roles?.forEach((r) => {
        const arr = rolesMap.get(r.user_id) || [];
        arr.push({ role: r.role });
        rolesMap.set(r.user_id, arr);
      });

      return profiles?.map((p) => ({
        ...p,
        user_roles: rolesMap.get(p.user_id) || [],
      }));
    },
    enabled: isAdmin && activeTab === "members",
  });

  const saveLessonMutation = useMutation({
    mutationFn: async (lesson: LessonInsert & { id?: string }) => {
      if (lesson.id) {
        const { error } = await supabase.from("lessons").update(lesson).eq("id", lesson.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lessons").insert(lesson);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      setShowForm(false);
      setEditingLesson(null);
      toast.success("Aula salva com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast.success("Aula removida!");
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("lessons").update({ is_published: published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
    },
  });

  if (loading) return null;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background transition-theme">
      <Header />
      <main className="container max-w-5xl py-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Painel Administrativo</h2>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveTab("lessons")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "lessons"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Aulas
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "members"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Membros
          </button>
        </div>

        {activeTab === "lessons" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                {lessons?.length || 0} aulas cadastradas
              </p>
              <button
                onClick={() => {
                  setEditingLesson(null);
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Nova Aula
              </button>
            </div>

            {showForm && (
              <LessonForm
                lesson={editingLesson}
                nextOrder={(lessons?.length || 0) + 1}
                onSave={(data) => saveLessonMutation.mutate(data)}
                onCancel={() => { setShowForm(false); setEditingLesson(null); }}
                loading={saveLessonMutation.isPending}
              />
            )}

            <div className="space-y-3">
              {lessons?.map((lesson, i) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-theme"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h4 className="font-medium text-foreground truncate">{lesson.title}</h4>
                    </div>
                    {lesson.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {lesson.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => togglePublishMutation.mutate({ id: lesson.id, published: !lesson.is_published })}
                      className={`rounded-md p-2 transition-colors ${
                        lesson.is_published
                          ? "text-primary hover:bg-primary/10"
                          : "text-muted-foreground hover:bg-accent"
                      }`}
                      title={lesson.is_published ? "Publicada" : "Rascunho"}
                    >
                      {lesson.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => { setEditingLesson(lesson); setShowForm(true); }}
                      className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Remover esta aula?")) deleteLessonMutation.mutate(lesson.id);
                      }}
                      className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              {members?.length || 0} membros cadastrados
            </p>
            {members?.map((member: any) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-theme"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {member.full_name || "Sem nome"}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {member.user_roles?.map((r: any) => (
                    <span
                      key={r.role}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.role === "admin"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.role}
                    </span>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

// Lesson Form Component
interface LessonFormProps {
  lesson: Lesson | null;
  nextOrder: number;
  onSave: (data: LessonInsert & { id?: string }) => void;
  onCancel: () => void;
  loading: boolean;
}

const LessonForm = ({ lesson, nextOrder, onSave, onCancel, loading }: LessonFormProps) => {
  const [title, setTitle] = useState(lesson?.title || "");
  const [description, setDescription] = useState(lesson?.description || "");
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(lesson?.thumbnail_url || "");
  const [thumbnailMode, setThumbnailMode] = useState<"youtube" | "upload" | "none">(
    lesson?.thumbnail_url?.includes("youtube") || lesson?.thumbnail_url?.includes("ytimg") ? "youtube" : lesson?.thumbnail_url ? "upload" : "none"
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState(lesson?.link_url || "");
  const [linkLabel, setLinkLabel] = useState(lesson?.link_label || "");
  const [orderIndex, setOrderIndex] = useState(lesson?.order_index ?? nextOrder);
  const [isPublished, setIsPublished] = useState(lesson?.is_published ?? false);

  // Auto-extract YouTube thumbnail when video URL changes
  useEffect(() => {
    if (thumbnailMode === "youtube" && videoUrl) {
      const thumb = getYoutubeThumbnail(videoUrl);
      if (thumb) setThumbnailUrl(thumb);
    }
  }, [videoUrl, thumbnailMode]);

  const resizeImage = (file: File, maxWidth = 800, quality = 0.85): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const ratio = Math.min(maxWidth / img.width, 1);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob!), "image/webp", quality);
      };
      img.src = url;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const optimized = await resizeImage(file);
      const fileName = `${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("thumbnails").upload(fileName, optimized, {
        contentType: "image/webp",
        cacheControl: "31536000",
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(fileName);
      setThumbnailUrl(urlData.publicUrl);
      setThumbnailMode("upload");
    } catch (err: any) {
      toast.error("Erro ao enviar imagem: " + err.message);
    }
    setUploading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(lesson?.id ? { id: lesson.id } : {}),
      title,
      description: description || null,
      video_url: videoUrl || null,
      thumbnail_url: thumbnailUrl || null,
      link_url: linkUrl || null,
      link_label: linkLabel || null,
      order_index: orderIndex,
      is_published: isPublished,
    });
  };

  const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-theme";

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-border bg-card p-5 space-y-4 transition-theme">
      <h3 className="font-semibold text-foreground">
        {lesson ? "Editar Aula" : "Nova Aula"}
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Título *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Ordem</label>
          <input type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">URL do Vídeo</label>
        <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className={inputClass} placeholder="https://youtube.com/watch?v=..." />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Thumbnail</label>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              setThumbnailMode("youtube");
              const thumb = getYoutubeThumbnail(videoUrl);
              if (thumb) setThumbnailUrl(thumb);
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
              thumbnailMode === "youtube"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Youtube className="h-3.5 w-3.5" />
            Do YouTube
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
              thumbnailMode === "upload"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Enviando..." : "Enviar imagem"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>
        {thumbnailUrl && (
          <div className="relative inline-block">
            <img
              src={thumbnailUrl}
              alt="Thumbnail preview"
              className="h-24 w-40 rounded-md object-cover border border-border"
            />
            <button
              type="button"
              onClick={() => { setThumbnailUrl(""); setThumbnailMode("none"); }}
              className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {thumbnailMode === "youtube" && !thumbnailUrl && videoUrl && (
          <p className="text-xs text-muted-foreground">Insira uma URL válida do YouTube acima.</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">URL do Link</label>
          <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className={inputClass} placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Texto do Botão</label>
          <input type="text" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className={inputClass} placeholder="Acessar Link" />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="rounded border-input"
        />
        <span className="text-sm text-foreground">Publicar aula</span>
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {loading ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default Admin;
