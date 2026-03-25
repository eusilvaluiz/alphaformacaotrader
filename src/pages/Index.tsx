import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import LessonCard from "@/components/LessonCard";
import VideoModal from "@/components/VideoModal";
import { Database } from "@/integrations/supabase/types";

type Lesson = Database["public"]["Tables"]["lessons"]["Row"];

const Index = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("is_published", true)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Lesson[];
    },
  });

  return (
    <div className="min-h-screen bg-background transition-theme">
      <Header />

      <main className="container max-w-4xl py-12">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            AULAS PRÁTICAS
          </h2>
          <p className="mt-3 text-muted-foreground">
            Cada aula foi cuidadosamente estruturada para o seu aprendizado.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : lessons && lessons.length > 0 ? (
          <div className="space-y-5">
            {lessons.map((lesson, index) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                index={index}
                onPlayVideo={setVideoUrl}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg text-muted-foreground">
              Nenhuma aula disponível no momento.
            </p>
          </div>
        )}
      </main>

      <VideoModal videoUrl={videoUrl} onClose={() => setVideoUrl(null)} />
    </div>
  );
};

export default Index;
