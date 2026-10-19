import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/utils/alertHelper";
import { testEndpoint } from "../api/devtools.api";

// Keep in sync with the server allowlist in devtools.v2.controller.ts.
const allowedEndpoints: Record<string, string[]> = {
  "/api/v2/auth/login": ["POST"],
  "/api/v2/merchandise": ["GET"],
  "/api/v2/events/get-all-event": ["GET"],
  "/api/v2/dev/health": ["GET"],
};

const allMethods = Object.values(allowedEndpoints).flat();

export const ApiTesterPanel = () => {
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("");
  const availableMethods = allowedEndpoints[path] || allMethods;

  useEffect(() => {
    if (availableMethods.length > 0 && !availableMethods.includes(method)) {
      setMethod(availableMethods[0]);
    }
  }, [availableMethods, method]);

  const [body, setBody] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    if (!path) {
      showToast("error", "Please enter an endpoint path");
      return;
    }
    if (!allowedEndpoints[path]?.includes(method)) {
      showToast("error", `Method ${method} is not allowed for this endpoint`);
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      // A relative fetch("/api/...") only works behind the Vite dev proxy; in
      // production Vercel serves index.html for it. Go through the backend URL.
      const { data } = await testEndpoint({
        path,
        method,
        body: body ? JSON.parse(body) : undefined,
      });
      setResponse(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      setResponse(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-xs font-medium">Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="h-9 rounded-lg border-[#ececec]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMethods.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium">
            Endpoint Path
          </Label>
          <Select value={path} onValueChange={setPath}>
            <SelectTrigger className="h-9 rounded-lg border-[#ececec]">
              <SelectValue placeholder="Select or type path" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(allowedEndpoints).map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block text-xs font-medium">
          Request Body (JSON)
        </Label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder='{"key": "value"}'
          className="h-24 w-full resize-none rounded-lg border border-[#ececec] bg-white p-3 font-mono text-sm"
        />
      </div>

      <Button
        type="button"
        className="h-9 rounded-full bg-[#1c9dde] hover:bg-[#168bc7]"
        onClick={handleTest}
        disabled={loading}
      >
        {loading ? "Sending..." : "Send Request"}
      </Button>

      {response && (
        <div>
          <Label className="mb-1.5 block text-xs font-medium">Response</Label>
          <pre className="rounded-lg border border-[#ececec] bg-[#f7f7f7] p-4 font-mono text-xs text-[#303030]">
            {response}
          </pre>
        </div>
      )}
    </div>
  );
};
