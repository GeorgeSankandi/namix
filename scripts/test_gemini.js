// Retry-capable test script using 127.0.0.1 to avoid localhost resolution issues
(async () => {
  const url = 'http://127.0.0.1:5000/graphql';
  const payload = {
    query: `query { askChatbot(question: "Hello, what products do you have?") { reply navigationTarget } }`
  };

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      process.exit(0);
    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err.message || err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.error('All attempts failed');
  process.exit(1);
})();
