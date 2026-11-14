let VULNERABLE = true;

async function loadGame() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || "minecraft";

  const mode = await fetch("/api/mode").then(r => r.json());
  VULNERABLE = mode.vulnerable;
  const badge = document.getElementById("mode-badge");
  badge.textContent = "Mode: " + (VULNERABLE ? "VULNERABLE" : "SAFE");
  badge.className = "mode " + (VULNERABLE ? "bad" : "good");

  document.getElementById("toggle-btn").onclick = async () => {
    await fetch("/api/toggle", { method: "POST" });
    location.reload();
  };

  const { game, comments } = await fetch("/api/games/" + id).then(r => r.json());

  document.getElementById("game-header").innerHTML = `
    <div style="display:flex; gap: 20px;">
      <img src="${game.img}" style="max-width:300px; border-radius:8px;">
      <div>
        <h2 style="margin-top:0;">${game.title}</h2>
        <h3 style="color:#6f6; margin: 0;">${game.price}</h3>
        <p style="color:#aaa; margin: 15px 0;">${game.review}</p>
        <button style="width:200px; font-size:1.1rem; padding:12px;">Add to Cart</button>
      </div>
    </div>
  `;

  const container = document.getElementById("comments");
  container.innerHTML = "";

  for (const c of comments) {
    const div = document.createElement("div");
    div.className = "comment";

    const name = document.createElement("b");
    name.textContent = c.name;
    div.appendChild(name);

    const body = document.createElement("p");

    if (VULNERABLE) {
      // THE BUG
      body.innerHTML = c.text;
    } else {
      // THE FIX
      body.textContent = c.text;
    }

    div.appendChild(body);
    container.appendChild(div);
  }
}

document.getElementById("comment-form").onsubmit = async (e) => {
  e.preventDefault();
  const id = new URLSearchParams(location.search).get("id") || "minecraft";
  const name = document.getElementById("c-name").value;
  const text = document.getElementById("c-text").value;

  await fetch("/api/games/" + id + "/comments", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "name=" + encodeURIComponent(name) + "&text=" + encodeURIComponent(text)
  });
  location.reload();
};

loadGame();