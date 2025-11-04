"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return (
    <div style={{ 
      minHeight: "100vh", 
      padding: "50px", 
      background: "lightblue",
      fontSize: "24px" 
    }}>
      <h1 style={{ color: "red", fontWeight: "bold" }}>✅ ROOT PAGE WORKS!</h1>
      <p>Next.js is serving pages correctly.</p>
      {mounted && <p>Time: {new Date().toLocaleString()}</p>}
      <a href="/login" style={{ color: "blue", textDecoration: "underline" }}>
        Go to Login Page
      </a>
      <br />
      <a href="/test" style={{ color: "blue", textDecoration: "underline" }}>
        Go to Test Page
      </a>
    </div>
  );
}
