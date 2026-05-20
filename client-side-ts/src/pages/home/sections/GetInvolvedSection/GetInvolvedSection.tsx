import { cn } from "@/lib/utils";
import { useRef, useEffect, useState, useCallback } from "react";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import Avatar1 from "@/assets/Core Officers 2025/1.png";
import Avatar2 from "@/assets/Core Officers 2025/2.png";
import Avatar3 from "@/assets/Core Officers 2025/3.png";
import Avatar4 from "@/assets/Core Officers 2025/5.png";
import { getInvolvedData } from "@/data/sections-data";
import { GetInvolvedCard } from "./GetInvolvedCard";

export const GetInvolvedSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const [isLg, setIsLg] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );

  const calculateMaxScroll = useCallback(() => {
    const lg = window.innerWidth >= 1024;
    setIsLg(lg);

    if (cardsRef.current && lg) {
      // Visible area = viewport height minus padding (py-20 = 80px * 2)
      const visibleHeight = window.innerHeight - 160;
      // Total content height
      const contentHeight = cardsRef.current.scrollHeight;
      // Max scroll = how much content overflows
      const scroll = Math.max(0, contentHeight - visibleHeight);
      setMaxScroll(scroll);
    } else {
      setMaxScroll(0);
    }
  }, []);

  // Calculate on mount and resize
  useEffect(() => {
    // Delay initial calculation to ensure DOM is ready
    const timeout = setTimeout(calculateMaxScroll, 100);

    window.addEventListener("resize", calculateMaxScroll);

    // Watch for content changes
    const observer = new ResizeObserver(calculateMaxScroll);
    if (cardsRef.current) {
      observer.observe(cardsRef.current);
    }

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", calculateMaxScroll);
      observer.disconnect();
    };
  }, [calculateMaxScroll]);

  // Handle scroll
  useEffect(() => {
    if (!isLg || maxScroll === 0) return;

    const onScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const progress = Math.min(Math.max(-rect.top, 0), maxScroll);
      setScrollY(progress);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // Call once to set initial position

    return () => window.removeEventListener("scroll", onScroll);
  }, [maxScroll, isLg]);

  return (
    <div
      ref={sectionRef}
      style={{ height: isLg ? `calc(100vh + ${maxScroll}px)` : "auto" }}
    >
      <div
        className={cn(
          "bg-background overflow-x-clip",
          isLg ? "sticky top-0 h-screen overflow-y-hidden" : "py-16 md:py-20"
        )}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="bg-primary/5 absolute -top-[10%] -left-[5%] h-[40%] w-[40%] rounded-full blur-[120px]" />
          <div className="bg-primary/10 absolute -right-[5%] -bottom-[10%] h-[30%] w-[30%] rounded-full blur-[100px]" />
        </div>

        <div className={cn("container mx-auto px-4 md:px-6", isLg && "h-full")}>
          <div
            className={cn(
              "flex flex-col justify-between gap-8 md:gap-12 lg:flex-row lg:gap-16",
              isLg && "h-full py-20"
            )}
          >
            <div className="flex flex-col justify-center space-y-4 md:space-y-6 lg:w-5/12">
              <h2 className="text-primary text-xs font-bold tracking-[0.2em] uppercase md:text-sm">
                {getInvolvedData.header.subtitle}
              </h2>
              <h1
                className={cn(
                  "text-2xl leading-[0.9] font-black tracking-tighter uppercase sm:text-3xl md:text-4xl lg:text-5xl",
                  "from-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-transparent"
                )}
              >
                {getInvolvedData.header.titlePrefix}{" "}
                <br className="hidden sm:block" />{" "}
                {getInvolvedData.header.titleSuffix}
              </h1>
              <p className="text-muted-foreground max-w-md text-base md:text-lg">
                {getInvolvedData.header.description}
              </p>
              <div className="flex items-center gap-3 pt-2 md:gap-4">
                <div className="flex -space-x-2 md:-space-x-3">
                  {[Avatar1, Avatar2, Avatar3, Avatar4].map((src, idx) => (
                    <div
                      key={idx}
                      className="border-background bg-muted h-8 w-8 overflow-hidden rounded-full border-2 md:h-10 md:w-10"
                    >
                      <OptimizedImage
                        src={src}
                        alt={`member ${idx + 1}`}
                        className="h-full w-full object-cover"
                        containerClassName="h-full w-full"
                        blur={false}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs md:text-sm">
                  <span className="text-foreground font-bold">
                    {getInvolvedData.header.memberCount}
                  </span>{" "}
                  IT Students joined
                </p>
              </div>
            </div>

            <div className={cn("lg:w-7/12", isLg && "")}>
              <div
                ref={cardsRef}
                className="flex flex-col gap-4 md:gap-6"
                style={
                  isLg ? { transform: `translateY(-${scrollY}px)` } : undefined
                }
              >
                {getInvolvedData.cards.map((card, i) => (
                  <GetInvolvedCard key={i} {...card} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
