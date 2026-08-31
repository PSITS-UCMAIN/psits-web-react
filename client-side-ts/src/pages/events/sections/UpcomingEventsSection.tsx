import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Calendar, MapPin } from "lucide-react";
import { eventsData } from "@/data/sections-data";
import { isEventPast, formatEventDateRange } from "@/data/events.utils";
import { OptimizedImage } from "@/components/common/OptimizedImage";

const currentYear = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  year: "numeric",
}).format(new Date());

export const UpcomingEventsSection = () => {
  const events = eventsData.events
    .filter((event) => !isEventPast(event))
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime()
    );

  return (
    <section className="mx-auto max-w-7xl overflow-hidden px-4 py-12 md:px-8">
      <div className="mb-8 flex flex-col">
        <h2 className="text-foreground text-3xl font-black">
          Upcoming Events
        </h2>
        <p className="text-muted-foreground font-medium">{currentYear}</p>
      </div>

      <div className="relative">
        {events.length > 0 ? (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {events.map((event) => (
              <CarouselItem
                key={event.id}
                  className="basis-[85%] pl-4 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <Card className="group relative h-[320px] overflow-hidden rounded-2xl border-none bg-black p-0 shadow-md transition-all duration-300 hover:scale-[1.02]">
                  {/* Background Image */}
                  <div className="absolute inset-0">
                    <OptimizedImage
                      src={event.image}
                      alt={event.title}
                      containerClassName="h-full w-full"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                    </div>

                  <CardContent className="absolute right-0 bottom-0 left-0 p-5  text-white">
                    <h3 className="group-hover:text-primary mb-2 text-lg leading-tight font-bold transition-colors">
                      {event.title}
                    </h3>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <Calendar className="text-primary h-3.5 w-3.5" />
                        <span>{formatEventDateRange(event)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <MapPin className="text-primary h-3.5 w-3.5" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border">
          <p className="text-muted-foreground text-lg">
            No upcoming events yet.
          </p>
        </div>
        )}
      </div>
    </section>
  );
};
