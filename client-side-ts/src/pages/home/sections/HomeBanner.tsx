import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import banner from "@/assets/banner.png";
import { homeBannerData } from "@/data/sections-data";
import { OptimizedImage } from "@/components/common/OptimizedImage";

export const HomeBanner = () => {
  return (
    <section className="flex flex-col items-center justify-center gap-8 pt-30 pb-12 sm:pt-20 md:gap-10 md:pt-24 lg:gap-14 lg:pt-32">
      <Card className="container flex flex-col items-center border-none bg-transparent py-0 text-center shadow-none">
        <CardContent className="flex max-w-[900px] flex-col items-center gap-6 p-0">
          <CardTitle className="text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
            {homeBannerData.title.normal}{" "}
            <span className="text-primary block sm:inline">
              {homeBannerData.title.highlight}
            </span>
          </CardTitle>
          <CardDescription className="text-muted-foreground mx-auto max-w-2xl text-base leading-relaxed sm:text-lg md:text-xl">
            {homeBannerData.description}
          </CardDescription>
          <div className="mt-4 flex w-full flex-col gap-4 px-4 sm:w-auto sm:flex-row sm:px-0">
            <Button
              size="lg"
              className="h-12 w-full rounded-full px-8 text-base font-semibold sm:w-auto"
              asChild
            >
              <Link to="/auth/signup">{homeBannerData.buttons.primary}</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-full rounded-full px-8 text-base font-semibold sm:w-auto"
              asChild
            >
              <Link to="/organizations">
                {homeBannerData.buttons.secondary}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="h-[50vh] w-full overflow-hidden sm:h-[60vh] md:h-[70vh] lg:h-[80vh]">
        <OptimizedImage
          src={banner}
          alt={homeBannerData.image.alt}
          className="h-full w-full object-cover"
          priority
        />
      </div>
    </section>
  );
};
