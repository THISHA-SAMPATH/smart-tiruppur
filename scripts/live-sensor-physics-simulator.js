#!/usr/bin/env node

/**
 * 💧 NoyyalSense — Physics-Aware Sensor Network & River Transport Simulator
 * 
 * Run with: node scripts/live-sensor-physics-simulator.js
 * 
 * Features:
 * 1. 1D Advection-Dispersion Transport Math (dC/dt + u*dC/dx = D*d2C/dx2)
 * 2. Downstream Multi-Node Telemetry Stream (Orathupalayam, Kasipalayam, Mangalam)
 * 3. ASCII Chemical Plume Waveform Renderer
 * 4. Bayesian Posterior Probability & Abstention Threshold Decision Engine
 */

const readline = require("readline");

// Colors for Terminal Formatting
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

// Noyyal River Physical Parameters
const RIVER_PARAMS = {
  velocity_u: 0.85, // Flow velocity in m/s
  dispersion_D: 4.2, // Dispersion coefficient in m2/s
  decay_k: 0.0001, // Degradation rate per second
  sensor_nodes: [
    { id: "S_01", name: "Node 01: Orathupalayam Dam", distance_m: 1200 },
    { id: "S_02", name: "Node 02: Kasipalayam Reach", distance_m: 4500 },
    { id: "S_03", name: "Node 03: Mangalam Reach", distance_m: 8200 },
  ],
  industrial_units: [
    { id: "unit_001", name: "Sirupooluvapatti Dyeing Co-Op", location_m: 800 },
    { id: "unit_007", name: "Mangalam Textile Processors (unit_007)", location_m: 3800 },
    { id: "unit_012", name: "Kunnathur Wet Processing Unit", location_m: 7100 },
  ],
};

// Simulation State
let time_step = 0;
let release_active = false;
let release_source = "unit_007";
let release_mass_kg = 250; // kg of chemical salt

function clearConsole() {
  process.stdout.write("\x1Bc");
}

/** 1D Analytical Advection-Dispersion Solution */
function calculateConcentration(x_meters, t_seconds, mass_kg = 250) {
  if (t_seconds <= 0) return 0;
  const u = RIVER_PARAMS.velocity_u;
  const D = RIVER_PARAMS.dispersion_D;
  const A = 15.0; // River cross-sectional area (m2)

  // C(x,t) = (M / (A * sqrt(4 * pi * D * t))) * exp(-((x - u*t)^2) / (4*D*t))
  const denom = A * Math.sqrt(4 * Math.PI * D * t_seconds);
  const exponent = -Math.pow(x_meters - u * t_seconds, 2) / (4 * D * t_seconds);
  const conc = (mass_kg / denom) * Math.exp(exponent);
  return Math.max(0, isNaN(conc) ? 0 : conc);
}

/** Render Live ASCII Waveform Animation Frame */
function renderFrame() {
  clearConsole();

  console.log(`${COLORS.cyan}${COLORS.bright}================================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}  💧 NoyyalSense Physics Transport & Bayesian Sensor Network Simulator${COLORS.reset}`);
  console.log(`${COLORS.dim}  Academic Demonstration CLI — 1D Advection-Dispersion Hydrological Model${COLORS.reset}`);
  console.log(`${COLORS.cyan}================================================================================${COLORS.reset}\n`);

  const t_sec = time_step * 10; // 10s per simulation tick
  console.log(`${COLORS.bright}⏱️  Simulation Elapsed Time:${COLORS.reset} ${t_sec}s (Tick #${time_step}) | ${COLORS.bright}Status:${COLORS.reset} ${release_active ? COLORS.red + "⚠️ INDUSTRIAL DISCHARGE ACTIVE (" + release_source + ")" : COLORS.green + "✓ Normal Baseline Operations"}${COLORS.reset}`);
  console.log(`${COLORS.dim}Advection Velocity (u): ${RIVER_PARAMS.velocity_u} m/s | Dispersion (D): ${RIVER_PARAMS.dispersion_D} m²/s${COLORS.reset}\n`);

  // Sensor Nodes Telemetry Table
  console.log(`${COLORS.bright}📊 DOWNSTREAM SENSOR TELEMETRY STREAM:${COLORS.reset}`);
  console.log(`+---------+--------------------------------+------------+----------+-----------+----------------+`);
  console.log(`| Node ID | Sensor Station Name            | Distance   | EC (uS)  | pH Value  | Signal Plume   |`);
  console.log(`+---------+--------------------------------+------------+----------+-----------+----------------+`);

  let max_signal_node = null;
  let max_ec = 0;

  RIVER_PARAMS.sensor_nodes.forEach((node) => {
    const conc = release_active ? calculateConcentration(node.distance_m, t_sec, release_mass_kg) : 0;
    const base_ec = 1400; // Baseline EC
    const ec_value = Math.round(base_ec + conc * 350);
    const ph_value = (7.2 + (conc > 0.5 ? 1.4 : 0.1)).toFixed(1);

    if (ec_value > max_ec) {
      max_ec = ec_value;
      max_signal_node = node;
    }

    // Generate ASCII bar chart for signal
    const bar_length = Math.min(Math.round((ec_value - 1400) / 80), 14);
    const bar_char = ec_value > 2500 ? COLORS.red + "█".repeat(bar_length) : ec_value > 1800 ? COLORS.yellow + "█".repeat(bar_length) : COLORS.cyan + "░".repeat(bar_length);

    console.log(
      `| ${COLORS.cyan}${node.id.padEnd(7)}${COLORS.reset} | ${node.name.padEnd(30)} | ${(node.distance_m + "m").padEnd(10)} | ${(ec_value + "").padEnd(8)} | ${ph_value.padEnd(9)} | ${bar_char.padEnd(14 + 10)}${COLORS.reset} |`
    );
  });
  console.log(`+---------+--------------------------------+------------+----------+-----------+----------------+\n`);

  // Bayesian Source Attribution Engine Output
  console.log(`${COLORS.bright}🧠 BAYESIAN SOURCE ATTRIBUTION ENGINE (FastAPI Mirror):${COLORS.reset}`);
  
  let p_unit007 = release_active ? Math.min(0.92, 0.45 + (max_ec - 1400) / 2500) : 0.08;
  let p_unit001 = release_active ? (1 - p_unit007) * 0.6 : 0.12;
  let p_unit012 = release_active ? (1 - p_unit007) * 0.4 : 0.10;

  let decision = "NORMAL";
  let decision_color = COLORS.green;

  if (p_unit007 > 0.75) {
    decision = "INVESTIGATE (High Confidence → Unit 007)";
    decision_color = COLORS.red;
  } else if (p_unit007 > 0.30) {
    decision = "ABSTAIN (Uncertainty High / Multi-Source Ambiguity)";
    decision_color = COLORS.yellow;
  }

  console.log(`  • Posterior Probability P(unit_007 | Telemetry): ${COLORS.bright}${(p_unit007 * 100).toFixed(1)}%${COLORS.reset}`);
  console.log(`  • Posterior Probability P(unit_001 | Telemetry): ${(p_unit001 * 100).toFixed(1)}%`);
  console.log(`  • Posterior Probability P(unit_012 | Telemetry): ${(p_unit012 * 100).toFixed(1)}%`);
  console.log(`  • ${COLORS.bright}3-Tier Evidence Decision:${COLORS.reset} ${decision_color}${COLORS.bright}[ ${decision} ]${COLORS.reset}\n`);

  // Controls Legend
  console.log(`${COLORS.dim}--------------------------------------------------------------------------------${COLORS.reset}`);
  console.log(`${COLORS.bright}Interactive Commands:${COLORS.reset} [t] Trigger Release Event  [c] Clear Release  [q] Quit Simulation`);
  console.log(`${COLORS.dim}--------------------------------------------------------------------------------${COLORS.reset}`);
}

// Setup Keyboard Input
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on("keypress", (str, key) => {
  if (key.ctrl && key.name === "c") {
    process.exit();
  }
  if (key.name === "q") {
    console.log(`\nExiting simulator. Scientific simulation complete.\n`);
    process.exit();
  }
  if (key.name === "t") {
    release_active = true;
    time_step = 1;
  }
  if (key.name === "c") {
    release_active = false;
  }
});

// Run loop tick every 1000ms
setInterval(() => {
  time_step++;
  renderFrame();
}, 1000);

// Check for single non-interactive run flag
if (process.argv.includes("--once")) {
  renderFrame();
  console.log("\nSingle verification run completed.\n");
  process.exit(0);
}
