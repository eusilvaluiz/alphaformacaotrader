import { useState, useRef, useEffect } from "react";
import { Play, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Database } from "@/integrations/supabase/types";

type Lesson = Database["public"]["Tables"]["lessons"]["Row"];

interface LessonCardProps {
  lesson: Lesson;
  index: number;
  onPlayVideo: (videoUrl: string) => void;
}

const OptimizedThumbnail = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // If image is already cached, show immediately
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  return (
    <div className="relative h-full w-full bg-muted">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-all duration-300 ${
          loaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]"
        }`}
      />
    </div>
  );
};

const LessonCard = ({ lesson, index, onPlayVideo }: LessonCardProps) => {
  const orderLabel = String(index + 1).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="group overflow-hidden rounded-lg border border-lesson-card-border bg-lesson-card transition-theme hover:shadow-lg"
    >
      <div className="flex flex-col md:flex-row">
        {/* Thumbnail */}
        <div className="relative w-full md:w-72 shrink-0">
          <div className="aspect-video md:aspect-auto md:h-full overflow-hidden">
            {lesson.thumbnail_url ? (
              <OptimizedThumbnail src={lesson.thumbnail_url} alt={lesson.title} />
            ) : (
              <div className="flex h-full min-h-[160px] items-center justify-center bg-muted">
                <Play className="h-10 w-10 text-muted-foreground/40" />
              </div>
            )}
            {lesson.video_url && (
              <button
                onClick={() => onPlayVideo(lesson.video_url!)}
                className="absolute inset-0 flex items-center justify-center bg-foreground/0 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:bg-foreground/10"
              >
                {/* YouTube-style play button */}
                <svg viewBox="0 0 68 48" className="h-12 w-[68px] drop-shadow-lg scale-90 transition-transform duration-300 group-hover:scale-100">
                  <path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#FF0000"/>
                  <path d="M45 24L27 14v20" fill="#fff"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between p-5 md:p-6">
          <div>
            <h3 className="font-serif text-xl font-normal leading-tight tracking-tight text-foreground">
              <span className="italic text-brass">{orderLabel}</span> · {lesson.title}
            </h3>
            {lesson.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {lesson.description}
              </p>
            )}
          </div>
          {lesson.link_url && (
            <div className="mt-4 flex justify-end">
              <a
                href={lesson.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ExternalLink className="h-4 w-4" />
                {lesson.link_label || "Acessar Link"}
              </a>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LessonCard;
