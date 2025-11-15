const express = require("express");
const cors = require("cors");
const path = require("path");
const { createServer } = require("http");
const { SerialPort, ReadlineParser } = require("serialport");
const { Server } = require("socket.io");

// --------------- INITIAL CONFIG ---------------------

const app = express(); // Creates HTTP server
app.use(express.json()); // utility to process JSON in requests
app.use(cors()); // utility to allow clients to make requests from other hosts or ips
const httpServer = createServer(app); // Explicity creates an HTTP server from the Express app
app.use("/app1", express.static(path.join(__dirname, "../client"))); // Serves static files from the client directory
// Convenience: redirect root to client app
app.get("/", (_req, res) => res.redirect("/app1"));

// --------------- SOCKET CONFIG---------------------

const io = new Server(httpServer, {
  path: "/real-time",
  cors: {
    origin: "*", // Allow requests from any origin
  },
}); // Creates a WebSocket server, using the same HTTP server as the Express app and listening on the /real-time path

// --------------- SERIAL PORT CONFIG---------------------

let port; // will be initialized after detecting path
let parser;

async function initSerial() {
  const ports = await SerialPort.list();
  console.log("ports", ports);

  // Try to find an Arduino-like device, otherwise use env or a safe default
  const preferred = ports.find((p) => {
    const id = `${p.manufacturer || ""} ${p.friendlyName || ""} ${p.vendorId || ""}`.toLowerCase();
    return (
      id.includes("arduino") ||
      id.includes("wch") ||
      id.includes("ch340") ||
      id.includes("usb serial")
    );
  });

  const serialPath =
    process.env.SERIAL_PORT ||
    (preferred ? preferred.path : null) ||
    (process.platform === "win32" ? "COM4" : "/dev/ttyUSB0");

  console.log("Using serial path:", serialPath);

  port = new SerialPort({
    path: serialPath,
    baudRate: 115200,
    autoOpen: true,
  });

  parser = new ReadlineParser({ delimiter: "\r\n" });
  port.pipe(parser);

  port.on("open", () => {
    console.log("✅ Serial port opened successfully:", serialPath);
  });

  // Serial listeners
  parser.on("data", (data) => {
    try {
      // Try parsing as JSON first
      const payload = JSON.parse(data);
      console.log("📊 Parsed LDR data (JSON):", payload);
      io.emit("ldr", payload);
    } catch (e) {
      // If not JSON, try parsing "Fotoresistor value: XXX" format
      const match = data.match(/Fotoresistor value:\s*(\d+)/i);
      if (match) {
        const ldrValue = parseInt(match[1], 10);
        const payload = { ldr: ldrValue };
        console.log("📊 Parsed LDR data (text):", payload);
        io.emit("ldr", payload);
      } else {
        console.log("Non-JSON serial line:", data);
      }
    }
  });

  port.on("error", (err) => {
    console.log("❌ Serial port error:", err.message);
  });

  port.on("close", () => {
    console.log("⚠️ Serial port closed");
  });
}
initSerial();

// --------------- SERIAL LISTENERS ---------------------
// Moved into initSerial()

// --------------- API ENDPOINTS ---------------------

app.post("/on", (request, response) => {
  port?.write("ON\n", (err) => {
    // send a message to arduino
    if (err) {
      console.log("Error on write", err.message);
    }
    return true;
  });

  response.status(200).send("ok");
});

app.post("/off", (request, response) => {
  port?.write("OFF\n", (err) => {
    // send a message to arduino
    if (err) {
      console.log("Error on write", err.message);
    }
    return true;
  });

  response.status(200).send("ok");
});

// --------------- SOCKET LISTENERS ---------------------

io.on("connection", (socket) => {
  console.log("a user connected"); // This will be printed every time a client connects to the
  socket.on("turn-on", (message) => {
    port?.write("ON\n", (err) => {
      // send a message to arduino
      if (err) {
        console.log("Error on write", err.message);
      }
      return true;
    });
  });
  socket.on("turn-off", (message) => {
    port?.write("OFF\n", (err) => {
      // send a message to arduino
      if (err) {
        console.log("Error on write", err.message);
      }
      return true;
    });
  });

  // New: set RGB color (expects { r, g, b })
  socket.on("set-rgb", ({ r, g, b } = {}) => {
    if (!port) {
      console.log("ERROR: Serial port not initialized!");
      return;
    }
    const rr = Number.isFinite(r) ? Math.max(0, Math.min(255, Math.floor(r))) : 0;
    const gg = Number.isFinite(g) ? Math.max(0, Math.min(255, Math.floor(g))) : 0;
    const bb = Number.isFinite(b) ? Math.max(0, Math.min(255, Math.floor(b))) : 0;
    const command = `RGB ${rr},${gg},${bb}\n`;
    console.log("Sending to Arduino:", command.trim());
    port.write(command, (err) => {
      if (err) {
        console.log("Error writing RGB command:", err.message);
      } else {
        console.log("RGB command sent successfully");
      }
    });
  });

  // New: set how many green LEDs are on (0..3)
  socket.on("set-green-count", (count) => {
    if (!port) {
      console.log("ERROR: Serial port not initialized!");
      return;
    }
    const n = Math.max(0, Math.min(3, parseInt(count, 10) || 0));
    const command = `GREEN ${n}\n`;
    console.log("Sending to Arduino:", command.trim());
    port.write(command, (err) => {
      if (err) {
        console.log("Error writing GREEN command:", err.message);
      } else {
        console.log("GREEN command sent successfully");
      }
    });
  });
});

// --------------- START SERVER ---------------------

httpServer.listen(5050, () => {
  // Starts the server on port 5050
  console.log(`Server is running on http://localhost:${5050}`);
});
