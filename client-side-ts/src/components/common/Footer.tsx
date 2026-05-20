import { Link } from "react-router";
import { CardDescription, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import logo from "@/assets/logo.png";
import { ArrowRight, Facebook, Github, Mail, MapPin } from "lucide-react";
import { FaDiscord } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { BackgroundText } from "./BackgroundText";

interface FooterLinkProps {
  title: string;
  href: string;
}

const FooterLink = ({ title, href }: FooterLinkProps) => {
  return (
    <Link
      to={href}
      className="text-muted-foreground hover:text-primary inline-block transform text-sm transition-colors duration-200 hover:translate-x-1"
    >
      {title}
    </Link>
  );
};

export const Footer = () => {
  const quickLinks = [
    { title: "Home", href: "/" },
    { title: "Events", href: "/events" },
    { title: "Organizations", href: "/organizations" },
  ];

  const legalLinks = [
    { title: "Privacy Policy", href: "/privacy" },
    { title: "Terms of Service", href: "/terms" },
  ];

  return (
    <footer className="bg-background/95 supports-[backdrop-filter]:bg-background/60 relative mt-auto overflow-hidden border-t backdrop-blur">
      <div className="container mx-auto px-4 pt-16 pb-16 md:pb-24 lg:pb-32">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-16">
          {/* Brand Section */}
          <div className="col-span-1 flex flex-col gap-6 lg:col-span-2">
            <div className="group flex items-center gap-4">
              <div className="relative">
                <img
                  src={logo}
                  alt="PSITS Logo"
                  className="h-14 w-14 object-contain transition-transform duration-500 group-hover:scale-110"
                />
                <div className="bg-primary/20 absolute inset-0 -z-10 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
              </div>
              <div>
                <CardTitle className="text-md from-primary to-primary/60 bg-gradient-to-r bg-clip-text leading-tight font-bold tracking-tight text-transparent">
                  Philippine Society of Information Technology
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-xs font-bold tracking-[0.2em] uppercase">
                  Student Chapter
                </p>
              </div>
            </div>
            <CardDescription className="text-muted-foreground/80 max-w-md text-sm leading-relaxed">
              Empowering the next generation of IT professionals through
              innovation, collaboration, and professional excellence. Join our
              community and shape the future of technology in the Philippines.
            </CardDescription>
            <div className="flex gap-3">
              {[
                {
                  icon: Facebook,
                  href: "https://www.facebook.com/PSITS.UCmain",
                  color: "hover:bg-blue-600",
                },
                {
                  icon: Github,
                  href: "https://github.com/PSITS-UCMAIN/psits-web-react",
                  color: "hover:bg-zinc-800",
                },
                { icon: FaDiscord, href: "#", color: "hover:bg-indigo-600" },
              ].map((social, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="icon"
                  className={cn(
                    "rounded-full transition-all duration-300 hover:text-white",
                    social.color
                  )}
                  asChild
                >
                  <a href={social.href} target="_blank" rel="noreferrer">
                    <social.icon className="h-4 w-4" />
                  </a>
                </Button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-6">
            <h3 className="text-primary/80 text-sm font-bold tracking-widest uppercase">
              Navigation
            </h3>
            <nav className="flex flex-col gap-3.5">
              {quickLinks.map((link) => (
                <FooterLink key={link.href} {...link} />
              ))}
            </nav>
          </div>

          {/* Newsletter Section */}
          <div className="flex flex-col gap-6">
            <h3 className="text-primary/80 text-sm font-bold tracking-widest uppercase">
              Stay Connected
            </h3>
            <div className="flex flex-col gap-5">
              <div className="text-muted-foreground/90 flex items-start gap-3.5 text-sm">
                <div className="bg-primary/10 rounded-lg p-2">
                  <MapPin className="text-primary h-4 w-4" />
                </div>
                <span className="pt-0.5 leading-snug">
                  Sanciangko St., Cebu City, Central Visayas
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-medium">
                  Join our newsletter for updates
                </p>
                <form className="flex" onSubmit={(e) => e.preventDefault()}>
                  <div className="group relative flex-1">
                    <Mail className="text-muted-foreground/50 group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors" />
                    <Input
                      type="email"
                      placeholder="Your email address"
                      className="bg-muted/30 border-muted group-focus-within:bg-background rounded-full pr-11 pl-9 transition-all"
                    />
                    <Button
                      size="icon"
                      className="shadow-primary/25 hover:shadow-primary/40 group absolute top-1/2 right-1 h-8 w-8 shrink-0 -translate-y-1/2 rounded-full shadow-lg transition-all active:scale-95"
                    >
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-border/40 mt-16 flex flex-col items-center justify-between gap-6 border-t pt-8 md:flex-row">
          <p className="text-muted-foreground/60 text-xs font-medium">
            © {new Date().getFullYear()} PSITS Student Chapter. Designed with
            excellence.
          </p>
          <div className="flex gap-8">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-muted-foreground/60 hover:text-primary text-xs font-medium transition-colors"
              >
                {link.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <BackgroundText
        text="PSITS"
        parentStyle="absolute -bottom-16 sm:-bottom-24 md:-bottom-32 lg:-bottom-44 xl:-bottom-56 left-1/2 -translate-x-1/2 w-full text-center -z-10"
        childStyle="text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary/80"
      />
    </footer>
  );
};
