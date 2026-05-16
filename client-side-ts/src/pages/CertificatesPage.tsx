import { CertificateEventList } from "@/features/certificates";

export default function CertificatesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-12">
        <h1 className="text-3xl font-bold mb-2">My Certificates</h1>
        <p className="text-muted-foreground">
          View and download your certificates of participation for attended events.
        </p>
      </div>
      
      <CertificateEventList />
    </div>
  );
}
