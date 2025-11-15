"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-API-Key": process.env.NEXT_PUBLIC_API_KEY || "your-secret-api-key-here",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user data with permissions
        localStorage.setItem("token", data.token);
        const userData = {
          ...data.user,
          permissions: data.permissions || [],
          roles: data.roles || [],
        };
        localStorage.setItem("user", JSON.stringify(userData));

        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        const errorMsg = data.message || data.errors?.username?.[0] || "Invalid credentials";
        setError(errorMsg);
      }
    } catch (error) {
      setError("Cannot connect to server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Add visible marker for debugging
  console.log("✅ LoginPage is rendering!", new Date().toISOString());
  
  return (
    <div style={{ minHeight: "100vh", background: "lightgreen", padding: "20px" }}>
      {/* Debug banner */}
      <div style={{ 
        background: "red", 
        color: "white", 
        padding: "10px", 
        marginBottom: "20px",
        fontWeight: "bold"
      }}>
        ✅ LOGIN PAGE IS RENDERING! ✅
      </div>
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Quotation System</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 text-sm text-gray-600 space-y-1">
            <p><strong>Demo Credentials:</strong></p>
            <p>Username: admin | Password: password</p>
            <p>Username: demo | Password: demo123</p>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}