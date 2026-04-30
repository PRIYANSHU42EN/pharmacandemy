async function testAnalytics() {
  const event = {
    eventType: "audit_test",
    userId: "test-user-id",
    metadata: {
      source: "antigravity_audit",
      timestamp: new Date().toISOString()
    }
  };

  try {
    const response = await fetch("http://localhost:3000/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ events: [event] })
    });

    const result = await response.json();
    console.log("Analytics Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testAnalytics();
