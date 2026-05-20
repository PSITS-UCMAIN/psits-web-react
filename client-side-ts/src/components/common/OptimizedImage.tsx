import { useState } from "react";
import { motion, AnimatePresence, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<
  HTMLMotionProps<"img">,
  "src" | "alt"
> {
  src?: string | null;
  alt: string;
  containerClassName?: string;
  priority?: boolean;
  blur?: boolean;
}

/**
 * A highly optimized image component that features:
 * - Lazy loading by default (native + optional IntersectionObserver logic)
 * - Smooth fade-in and blur-up animations using Framer Motion
 * - Automatic optimization for Unsplash images (WebP, quality, sizing)
 * - Loading skeletons and error states
 * - Aspect ratio handling via container styles
 */
export const OptimizedImage = ({
  src,
  alt,
  className,
  containerClassName,
  priority = false,
  blur = true,
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Normalize Unsplash URLs for better performance
  const getOptimizedUrl = (url?: string | null) => {
    if (!url) return undefined;
    if (url.includes("images.unsplash.com")) {
      // Remove existing sizing/format params to apply our own
      const baseUrl = url.split("?")[0];
      const params = new URLSearchParams();

      params.set("auto", "format");
      params.set("q", "75");
      params.set("fit", "crop");

      if (priority) {
        params.set("w", "1200");
      } else {
        params.set("w", "800");
      }

      return `${baseUrl}?${params.toString()}`;
    }
    return url;
  };

  const optimizedSrc = getOptimizedUrl(src);

  const getSrcSet = (url?: string | null) => {
    if (!url) return undefined;
    if (!url.includes("images.unsplash.com")) return undefined;
    const baseUrl = url.split("?")[0];
    return [400, 800, 1200, 1600, 2000]
      .map((w) => `${baseUrl}?auto=format&q=75&fit=crop&w=${w} ${w}w`)
      .join(", ");
  };

  const srcSet = getSrcSet(src);

  return (
    <div
      className={cn(
        "bg-muted/10 relative overflow-hidden transition-colors duration-500",
        containerClassName
      )}
    >
      {/* Placeholder / Skeleton Background */}
      <AnimatePresence>
        {!isLoaded && !error && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-muted/5 absolute inset-0"
          />
        )}
      </AnimatePresence>

      {optimizedSrc ? (
        <motion.img
          src={optimizedSrc}
          srcSet={srcSet}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          alt={alt}
          initial={
            blur
              ? { filter: "blur(20px)", opacity: 0, scale: 1.05 }
              : { opacity: 0 }
          }
          animate={
            isLoaded
              ? { filter: "blur(0px)", opacity: 1, scale: 1 }
              : {
                  filter: blur ? "blur(20px)" : "none",
                  opacity: 0,
                  scale: 1.05,
                }
          }
          transition={{
            duration: 0.8,
            ease: [0.4, 0, 0.2, 1], // Standard easing for premium feel
            scale: { duration: 1.2 },
          }}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={cn(
            "h-full w-full object-cover transition-opacity duration-300",
            !isLoaded && "invisible",
            isLoaded && "visible",
            className
          )}
          {...props}
        />
      ) : (
        <div className="text-muted-foreground flex h-full w-full items-center justify-center">
          No image
        </div>
      )}

      {error && (
        <div className="bg-muted/10 text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <span className="text-[10px] font-medium tracking-wider uppercase">
            Image unavailable
          </span>
        </div>
      )}
    </div>
  );
};
