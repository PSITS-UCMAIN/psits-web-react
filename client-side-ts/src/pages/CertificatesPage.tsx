import { CertificateEventList } from "@/features/certificates";

export default function CertificatesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-12">
        <h1 className="mb-2 text-3xl font-bold">My Certificates</h1>
        <p className="text-muted-foreground">
          View and download your certificates of participation for attended
          events.
        </p>
      </div>

      <CertificateEventList />
    </div>
  );
}
