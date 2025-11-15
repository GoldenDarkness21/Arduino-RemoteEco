let socket = io("http://localhost:5050", { path: "/real-time" });

socket.on("connect", () => {
  console.log("✅ Connected to server");
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from server");
});

const colorInput = document.getElementById("rgb-input");
const colorPreview = document.getElementById("color-preview");
const greenRange = document.getElementById("green-count");
const greenCountLabel = document.getElementById("green-count-value");
const ldrLabel = document.getElementById("ldr-value");
const ldrFill = document.getElementById("ldr-fill");
const ldrPercentLabel = document.getElementById("ldr-percent");

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

colorInput.addEventListener("input", () => {
  const { r, g, b } = hexToRgb(colorInput.value);
  socket.emit("set-rgb", { r, g, b });
  // Reflect color locally
  colorPreview.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
});

greenRange.addEventListener("input", () => {
  const n = parseInt(greenRange.value, 10);
  greenCountLabel.textContent = String(n);
  console.log("Sending set-green-count event with value:", n);
  socket.emit("set-green-count", n);
});

socket.on("ldr", (data) => {
  // payload format: { ldr: number }
  if (typeof data?.ldr === "number") {
    ldrLabel.textContent = String(data.ldr);
    // map 0..1023 -> 0..100 %
    const percent = Math.max(0, Math.min(100, Math.round((data.ldr / 1023) * 100)));
    ldrFill.style.width = percent + "%";
    ldrPercentLabel.textContent = percent + "%";
  }
});
