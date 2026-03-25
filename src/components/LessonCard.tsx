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
                className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors hover:bg-foreground/10"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-110">
                  <Play className="h-6 w-6 ml-0.5" />
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between p-5 md:p-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {orderLabel} - {lesson.title}
            </h3>
            {lesson.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {lesson.description}
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {lesson.link_url && (
              <a
                href={lesson.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-transparent px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                {lesson.link_label || "Acessar Link"}
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LessonCard;
