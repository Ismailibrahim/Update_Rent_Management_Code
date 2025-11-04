"use client";

export default function SimpleDashboard() {
  return (
    <div style={{ padding: "20px", background: "white", minHeight: "100vh" }}>
      <h1 style={{ color: "red", fontSize: "24px" }}>SIMPLE DASHBOARD TEST</h1>
      <p>If you see this, the route is working!</p>
      <p>Time: {new Date().toLocaleString()}</p>
    </div>
  );
}

