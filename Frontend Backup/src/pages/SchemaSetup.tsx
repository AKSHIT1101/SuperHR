import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function SchemaSetup() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<any[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const { refreshFromToken } = useAuth();
  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

  // Load current schema so the user can see what fields exist.
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const token = localStorage.getItem("crm_token");
        const res = await fetch(`${API_BASE_URL}/schema/fields`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          setSchema(Array.isArray(data) ? data : []);
        } else {
          setSchema([]);
        }
      } catch {
        setSchema([]);
      } finally {
        setSchemaLoading(false);
      }
    };

    fetchSchema();
  }, [API_BASE_URL]);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("crm_token");

      // Always go through the LLM-backed schema endpoints:
      // - If no fields exist yet, use /schema/build + /schema/fields/bulk to create from scratch.
      // - If fields already exist, use /schema/edit so the LLM updates the current schema.
      if (schema.length === 0) {
        const buildRes = await fetch(`${API_BASE_URL}/schema/build`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ prompt }),
        });

        if (!buildRes.ok) {
          console.error("Schema build failed");
          return;
        }

        const buildData = await buildRes.json();
        const suggestedFields = buildData.suggested_fields ?? [];

        if (!Array.isArray(suggestedFields) || suggestedFields.length === 0) {
          console.error("No fields returned by schema build");
          return;
        }

        const bulkRes = await fetch(`${API_BASE_URL}/schema/fields/bulk`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ fields: suggestedFields }),
        });

        if (!bulkRes.ok) {
          console.error("Bulk field save failed");
          return;
        }
      } else {
        const editRes = await fetch(`${API_BASE_URL}/schema/edit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ prompt }),
        });

        if (!editRes.ok) {
          console.error("Schema edit failed");
          return;
        }
      }

      // Refresh user/org context and reload schema to reflect changes.
      await refreshFromToken();
      const updatedSchemaRes = await fetch(`${API_BASE_URL}/schema/fields`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (updatedSchemaRes.ok) {
        const updated = await updatedSchemaRes.json();
        setSchema(Array.isArray(updated) ? updated : []);
      }
      setPrompt("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Set up your contact schema</CardTitle>
            <CardDescription>
              Describe in natural language what fields you want on each contact. We&apos;ll design the
              schema for you. <span className="font-semibold">First name, last name, email, phone</span>{" "}
              are always included and cannot be removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <div className="font-semibold mb-1">Current fields:</div>
              <ul className="list-disc list-inside">
                <li>first_name (First Name)</li>
                <li>last_name (Last Name)</li>
                <li>email (Email)</li>
                <li>phone (Phone)</li>
                {!schemaLoading &&
                  schema.map((field: any) => (
                    <li key={field.attr_def_id}>
                      {field.field_name} ({field.display_name}) – {field.field_type}
                    </li>
                  ))}
                {schemaLoading && <li>Loading existing custom fields…</li>}
              </ul>
            </div>
            <Textarea
              placeholder="Example: We are a university alumni office. We track graduation year, degree, department, current employer, job title, and whether they are available for mentoring."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
            />
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={loading || !prompt.trim()}>
                {loading ? "Designing schema..." : "Continue"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="ml-2"
                onClick={async () => {
                  const token = localStorage.getItem("crm_token");
                  const res = await fetch(`${API_BASE_URL}/schema/complete-setup`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ prompt }),
                  });
                  if (res.ok) {
                    await refreshFromToken();
                    navigate("/", { replace: true });
                  }
                }}
              >
                Finish setup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

