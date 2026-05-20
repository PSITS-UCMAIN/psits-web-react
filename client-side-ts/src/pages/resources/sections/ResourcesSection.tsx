import React, { useState, useEffect } from "react";
import { tutorials } from "@/data/sections-data";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import {
  Card,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Resource = {
  id: number;
  title: string;
  category: string;
  excerpt: string;
  image: string;
  link?: string;
  year: "First Year" | "Second Year" | "Third Year" | "Fourth Year";
};

type TutorialItem = {
  course: string;
  link?: string;
  image?: string;
  excerpt?: string;
};

const buildResourcesFromTutorials = (): Resource[] => {
  const resources: Resource[] = [];
  let id = 1;

  const pushList = (list: TutorialItem[], year: Resource["year"]) => {
    list.forEach((t) => {
      resources.push({
        id: id++,
        title: t.course,
        category: "Tutorial",
        excerpt: t.excerpt ?? generateSummary(t.course),
        link: t.link ?? "",
        image: t.image ?? `https://picsum.photos/seed/tutorial-${id}/640/480`,
        year,
      });
    });
  };

  pushList(tutorials.firstYear || [], "First Year");
  pushList(tutorials.secondYear || [], "Second Year");
  pushList(tutorials.thirdYear || [], "Third Year");
  pushList(tutorials.fourthYear || [], "Fourth Year");

  return resources;
};

const DUMMY_RESOURCES: Resource[] = buildResourcesFromTutorials();

function generateSummary(course: string): string {
  const c = course.toLowerCase();
  if (c.includes("introduction to computing") || c.includes("intcom"))
    return "Fundamental computing concepts: hardware, software, algorithms, and basic problem solving.";
  if (c.includes("computer programming 1"))
    return "Covers programming basics: variables, control flow, functions, and problem-solving using C-like syntax.";
  if (c.includes("computer programming 2"))
    return "Builds on programming fundamentals with data structures, modular design, and intermediate language features.";
  if (c.includes("web") || c.includes("webdev"))
    return "Introduction to web design and development: HTML, CSS, JavaScript, and responsive layouts.";
  if (c.includes("discrete") || c.includes("discret"))
    return "Covers logic, set theory, combinatorics, and graph theory foundational to CS theory and algorithms.";
  if (c.includes("digital logic") || c.includes("digilog"))
    return "Digital circuits and logic design: gates, flip-flops, combinational and sequential circuits.";
  if (c.includes("object oriented") || c.includes("ooprog"))
    return "Object-oriented programming principles: classes, objects, inheritance, and polymorphism.";
  if (c.includes("platform") || c.includes("op. sys") || c.includes("os"))
    return "Platform technologies and operating system concepts: processes, memory, and system services.";
  if (c.includes("system analysis") || c.includes("sad"))
    return "System analysis and design methodologies: requirements, modeling, and design patterns.";
  if (c.includes("applications") || c.includes("appsdev"))
    return "Application development techniques and emerging technologies for building modern software.";
  if (c.includes("data structure") || c.includes("dastruc"))
    return "Core data structures and algorithms: arrays, lists, trees, sorting, and algorithmic complexity.";
  if (c.includes("data communications") || c.includes("datacom"))
    return "Fundamentals of networking and data communication protocols, topologies, and transmission concepts.";
  if (
    c.includes("information management") ||
    c.includes("db sys") ||
    c.includes("imdbsys")
  )
    return "Database fundamentals: relational design, SQL, normalization, and basic database operations.";
  if (c.includes("network") || c.includes("network31"))
    return "Computer networking principles: OSI model, routing, switching, and network protocols.";
  if (c.includes("security") || c.includes("infosec"))
    return "Information assurance and security basics: threats, defenses, cryptography, and best practices.";
  if (c.includes("testing") || c.includes("quality"))
    return "Software testing and quality assurance: test planning, methods, and automation basics.";
  if (c.includes("system integration") || c.includes("sysarch"))
    return "System integration and architecture concepts: component integration, middleware, and architectures.";
  if (c.includes("human computer interaction") || c.includes("hci"))
    return "HCI principles: usability, user-centered design, and interaction techniques.";
  if (c.includes("technopreneur") || c.includes("technopreneurship"))
    return "Technopreneurship topics: startup basics, product-market fit, and tech entrepreneurship.";
  if (c.includes("integrative") || c.includes("intprog"))
    return "Integrative programming topics combining multiple technologies into cohesive projects.";
  if (c.includes("hacker") || c.includes("hackerrank"))
    return "Practice coding problems and algorithm challenges to improve problem-solving and contest skills.";
  return `Overview and learning materials for ${course}.`;
}

export const ResourcesSection: React.FC = () => {
  const years: Resource["year"][] = [
    "First Year",
    "Second Year",
    "Third Year",
    "Fourth Year",
  ];
  const [activeYear, setActiveYear] = useState<Resource["year"]>("First Year");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(""), 300);
    return () => clearTimeout(t);
  }, []);

  const filtered = DUMMY_RESOURCES.filter(
    (r) =>
      r.year === activeYear &&
      (r.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.category.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.excerpt.toLowerCase().includes(debouncedSearch.toLowerCase()))
  );

  const RES_PER_PAGE = 9;
  const pageCount = Math.ceil(filtered.length / RES_PER_PAGE);
  const paginatedItems = filtered.slice(
    (page - 1) * RES_PER_PAGE,
    page * RES_PER_PAGE
  );

  // Search handler removed - was declared but not used

  return (
    <section className="relative min-h-screen w-full overflow-visible bg-gray-50/20">
      <div className="pointer-events-none sticky top-[7vh] left-0 z-0 flex hidden w-full justify-center md:flex">
        <span className="text-[8vw] font-black tracking-tighter text-gray-200 uppercase opacity-40 select-none md:text-[10vw]">
          Materials
        </span>
      </div>

      <div className="relative z-10 mx-auto -mt-[10vh] max-w-7xl px-6 pb-20 md:px-16">
        <header className="pt-6 pb-6 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-800 md:text-5xl">
            Resources
          </h2>
        </header>

        <nav
          className="mb-10 flex items-center justify-center gap-6"
          aria-label="Years"
        >
          {years.map((y) => (
            <button
              key={y}
              onClick={() => {
                setActiveYear(y);
                setPage(1);
              }}
              className={`mt-25 cursor-pointer pb-2 text-sm font-medium sm:mt-10 md:text-base ${
                activeYear === y
                  ? "border-b-2 border-[#1C9DDE] text-[#1C9DDE]"
                  : "text-gray-400"
              }`}
            >
              {y}
            </button>
          ))}
        </nav>

        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {paginatedItems.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-400 italic">
              No resources found.
            </div>
          ) : (
            paginatedItems.map((res) => <ResourceCard key={res.id} res={res} />)
          )}
        </div>

        {pageCount > 1 && (
          <footer className="mt-12 flex justify-center gap-3">
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                onClick={() => {
                  setPage(i + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  buttonVariants({
                    variant: page === i + 1 ? "outline" : "ghost",
                    size: "icon",
                  }),
                  page === i + 1
                    ? "border-transparent bg-[#1c9dde] text-white hover:bg-[#1a8acb] hover:text-white"
                    : "",
                  "h-12 w-12 cursor-pointer rounded-2xl text-sm font-bold shadow-sm transition-all"
                )}
              >
                {i + 1}
              </button>
            ))}
          </footer>
        )}
      </div>
    </section>
  );
};

const ResourceCard: React.FC<{ res: Resource }> = ({ res }) => {
  return (
    <Card className="group h-full rounded-3xl border border-gray-100 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
      <div className="relative aspect-video overflow-hidden rounded-t-2xl">
        <OptimizedImage
          src={res.image}
          alt={res.title}
          className="h-full w-full object-cover"
          containerClassName="h-full w-full"
        />
        <div className="absolute top-4 left-4">
          <Badge className="rounded-full border-0 bg-white/90 px-3 py-1 font-semibold text-[#1C9DDE]">
            {res.category}
          </Badge>
        </div>
      </div>

      <CardContent className="flex flex-col gap-3 px-5 pt-4 pb-0">
        <CardTitle className="truncate text-sm font-semibold text-gray-800">
          {res.title}
        </CardTitle>
        <CardDescription className="line-clamp-3 flex-1 text-sm text-gray-500">
          {res.excerpt}
        </CardDescription>
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between px-5">
        <button
          onClick={() => {
            if (res.link) window.open(res.link, "_blank", "noopener");
          }}
          className="cursor-pointer rounded-full border border-[#E6F6FF] px-4 py-2 text-sm font-medium text-[#1C9DDE] hover:bg-[#F2FBFF]"
        >
          Learn more ↗
        </button>
        <span className="text-xs text-gray-400">{res.year}</span>
      </CardFooter>
    </Card>
  );
};

export default ResourcesSection;
