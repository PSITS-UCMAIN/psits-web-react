import { CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import {
  organizationSectionData,
  type Member,
  type OrganizationTab,
} from "@/data/sections-data";

export default function OrganizationSection() {
  return (
    <section className="bg-background relative w-full overflow-hidden py-20 md:py-32 lg:py-48">
      <div className="relative z-10 container px-4 md:px-6">
        <div className="space-y-12">
          {/* Header Section */}
          <div className="max-w-3xl space-y-6">
            <div className="space-y-4">
              <span className="text-primary inline-block text-[10px] font-bold tracking-[0.3em] uppercase md:text-xs lg:text-sm">
                {organizationSectionData.header.subtitle}
              </span>
              <CardTitle className="text-foreground text-4xl leading-[0.9] font-black tracking-tight uppercase sm:text-5xl md:text-6xl lg:text-7xl">
                {organizationSectionData.header.title.normal}{" "}
                <span className="text-primary italic">
                  {organizationSectionData.header.title.highlight}
                </span>
              </CardTitle>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="w-full">
            <Tabs defaultValue="officers" className="w-full">
              <TabsList className="bg-muted/30 border-border/50 no-scrollbar mb-12 inline-flex h-auto w-full flex-nowrap justify-start overflow-x-auto rounded-xl border p-1 backdrop-blur-sm sm:w-auto">
                {[
                  { id: "advisors", label: "Advisors" },
                  { id: "officers", label: "Officers" },
                  { id: "developers", label: "Developers" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-primary/20 hover:bg-muted/50 hover:text-foreground relative flex min-w-fit cursor-pointer items-center gap-2 rounded-lg px-6 py-2.5 text-xs font-bold tracking-wider whitespace-nowrap transition-all duration-300 data-[state=active]:shadow-lg md:text-sm"
                  >
                    <span className="relative z-10 uppercase">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Content for each Role Tab */}
              {[
                { id: "advisors", label: "Advisors" },
                { id: "officers", label: "Officers" },
                { id: "developers", label: "Developers" },
                { id: "volunteers", label: "Volunteers" },
              ].map((role) => {
                const allMembers = organizationSectionData.tabs.reduce(
                  (acc, tab) => {
                    const members = (tab as OrganizationTab)[
                      role.id as keyof Pick<
                        OrganizationTab,
                        "advisors" | "officers" | "developers" | "volunteers"
                      >
                    ] as Member[] | undefined;
                    return members ? [...acc, ...members] : acc;
                  },
                  [] as Member[]
                );

                if (allMembers.length === 0) return null;

                return (
                  <TabsContent
                    key={role.id}
                    value={role.id}
                    className="mt-0 focus-visible:outline-none"
                  >
                    <div>
                      <MemberCarousel members={allMembers} title={role.label} />
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}

const MemberCarousel = ({
  members,
  title,
}: {
  members: Member[];
  title: string;
}) => {
  if (!members || members.length === 0) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <h3 className="text-foreground/80 text-xl font-bold tracking-wider uppercase md:text-2xl">
          {title}
        </h3>
        <div className="bg-border/50 h-px flex-1" />
      </div>
      <div className="relative">
        {/* Left fade gradient */}
        <div className="from-background pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-16 bg-gradient-to-r to-transparent md:w-32" />
        {/* Right fade gradient */}
        <div className="from-background pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-16 bg-gradient-to-l to-transparent md:w-32" />

        <Carousel
          opts={{
            align: "center",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {members.map((member, index) => (
              <CarouselItem
                key={index}
                className="basis-[85%] pl-2 sm:basis-[60%] md:basis-[45%] md:pl-4 lg:basis-[35%] xl:basis-[28%]"
              >
                <div className="group border-border/50 bg-muted relative aspect-[4/5] overflow-hidden rounded-3xl border">
                  <OptimizedImage
                    src={member.image}
                    alt={member.name}
                    containerClassName="absolute inset-0 h-full w-full"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-6 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <p className="text-lg leading-tight font-bold text-white">
                      {member.name}
                    </p>
                    <p className="text-sm font-medium tracking-wider text-white/80 uppercase">
                      {member.role}
                    </p>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Navigation arrows */}
          <CarouselPrevious className="bg-background/80 border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary absolute top-1/2 left-2 z-20 h-10 w-10 -translate-y-1/2 border shadow-lg backdrop-blur-sm transition-all duration-300 md:left-8 md:h-12 md:w-12" />
          <CarouselNext className="bg-background/80 border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary absolute top-1/2 right-2 z-20 h-10 w-10 -translate-y-1/2 border shadow-lg backdrop-blur-sm transition-all duration-300 md:right-8 md:h-12 md:w-12" />
        </Carousel>
      </div>
    </div>
  );
};
