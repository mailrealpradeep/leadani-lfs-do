import { useEffect, useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Impersonate() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (!code) {
      setError("No impersonation code provided");
      return;
    }

    async function redeemCode() {
      try {
        const response = await fetch("/api/impersonate/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to redeem code");
          return;
        }
        
        const data = await response.json();
        
        sessionStorage.setItem("auth_token", data.token);
        sessionStorage.setItem("impersonating", "true");
        sessionStorage.setItem("impersonated_user_name", data.user?.name || "Unknown User");
        sessionStorage.setItem("impersonated_user_email", data.user?.email || "");

        window.location.href = "/";
      } catch (err) {
        setError("Failed to initialize session");
      }
    }

    redeemCode();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Impersonation Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => window.close()} className="w-full" data-testid="button-close-window">
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading User Session...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please wait while we load the user's account...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
