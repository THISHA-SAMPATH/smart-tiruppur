# 🎓 Academic Blueprint & Hydrological Physics Guide

---

## 1. 🌊 1D Advection-Dispersion Mass Transport Equation

The movement of industrial dyeing effluent along the Noyyal River channel is governed by the **1D Unsteady Advection-Dispersion Mass Transport Differential Equation**:

$$\frac{\partial C}{\partial t} + u \frac{\partial C}{\partial x} = D_x \frac{\partial^2 C}{\partial x^2} - kC$$

Where:
- $C(x,t)$: Pollutant concentration ($g/m^3$ or $mg/L$) at distance $x$ and time $t$.
- $u$: Mean river flow velocity ($0.85 \text{ m/s}$ baseline).
- $D_x$: Longitudinal dispersion coefficient ($4.2 \text{ m}^2/\text{s}$).
- $k$: First-order chemical degradation/decay coefficient.

### Analytical Solution for Instantaneous Dye Release
For a slug mass release $M$ ($kg$) at time $t=0$, the concentration profile downstream is calculated by:

$$C(x,t) = \frac{M}{A \sqrt{4 \pi D_x t}} \exp\left( -\frac{(x - u t)^2}{4 D_x t} \right)$$

Where $A$ is the river cross-sectional area ($15.0 \text{ m}^2$).

---

## 2. 🧠 Bayesian Source Attribution Engine Mathematics

Rather than triggering alarms based solely on static thresholds, **NoyyalSense** uses **physics-aware Bayesian posterior inference**:

$$P(\text{Unit}_i \mid \mathbf{Y}_{\text{obs}}) = \frac{P(\mathbf{Y}_{\text{obs}} \mid \text{Unit}_i) P(\text{Unit}_i)}{\sum_{j=1}^{N} P(\mathbf{Y}_{\text{obs}} \mid \text{Unit}_j) P(\text{Unit}_j)}$$

Where:
- $\mathbf{Y}_{\text{obs}}$: Real-time telemetry vector $[\text{pH}, \text{EC}, \text{Turbidity}, \text{Flow}]$ from downstream sensor nodes.
- $P(\text{Unit}_i)$: Prior probability based on facility ZLD operational status and historic compliance records.
- $P(\mathbf{Y}_{\text{obs}} \mid \text{Unit}_i)$: Likelihood calculated by matching physical transport arrival times against sensor readings.

---

## 3. 📡 Downstream River Sensor Node Architecture

```
                                    NOYYAL RIVER FLOW (u = 0.85 m/s)
[Dyeing Unit 007] ---------> =========================================================>
  (Release Point)            Node 01: Orathupalayam Dam    Node 02: Kasipalayam    Node 03: Mangalam
                             (Distance: 1,200m)            (Distance: 4,500m)     (Distance: 8,200m)
```

| Sensor Node ID | Location Name | Hardware Sensor Suite | Sampling Rate |
| :--- | :--- | :--- | :--- |
| **Node 01 (`S_01`)** | Orathupalayam Dam Inlet | Industrial Toroidal EC, Glass pH Electrode, Optical Turbidity | 10 seconds |
| **Node 02 (`S_02`)** | Kasipalayam Reach | Submersible Conductivity & Temperature Sensor | 10 seconds |
| **Node 03 (`S_03`)** | Mangalam Reach | Multi-parameter Water Quality Probe (pH/EC/DO) | 10 seconds |

---

## 4. 🏢 Industrial Facility & ZLD Building Schema

Each certified textile unit in Tiruppur operates a **Zero Liquid Discharge (ZLD)** facility comprising:
1. **Primary Biological Treatment:** Anaerobic digestor for BOD/COD reduction.
2. **Reverse Osmosis (RO) Plant:** 3 to 4 stage spiral-wound RO membranes recovering $85\% - 95\%$ clean water.
3. **Multi-Effect Evaporator (MEE) & Crystallizer:** Thermal evaporation recovering solid salt crystals ($Na_2SO_4$, $NaCl$) for reuse in dyeing cycles.

---

## 💻 Running the Live Terminal Simulation

You can execute the interactive physical transport simulator directly in the terminal:

```bash
node scripts/live-sensor-physics-simulator.js
```

### Terminal Commands:
- **`t`**: Trigger simulated industrial chemical release from `unit_007`.
- **`c`**: Clear release event & restore normal river baseline.
- **`q`**: Exit simulation mode.
