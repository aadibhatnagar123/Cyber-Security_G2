async function init() {
    const mode = await fetch("/api/mode").then(r => r.json());
    const badge = document.getElementById("mode-badge");
    badge.textContent = "Mode: " + (mode.vulnerable ? "VULNERABLE" : "SAFE");
    badge.className = "mode " + (mode.vulnerable ? "bad" : "good");
  
    document.getElementById("toggle-btn").onclick = async () => {
      await fetch("/api/toggle", { method: "POST" });
      location.reload();
    };
  
    const games = await fetch("/api/games").then(r => r.json());
    const grid = document.getElementById("grid");
    grid.innerHTML = games.map(g => `
      <a class="card" href="/game.html?id=${g.id}">
        <img src="${g.img}" alt="${g.title}">
        <h3>${g.title}</h3>
        <div class="price">${g.price}</div>
      </a>
    `).join("");
  }
  init();