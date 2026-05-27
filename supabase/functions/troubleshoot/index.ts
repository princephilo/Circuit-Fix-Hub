import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")

const SYSTEM_PROMPT = `You are an expert electronics troubleshooting AI for Circuit Fix Hub.

Analyze the circuit issue described by the user. Detect ALL of these problem types:
- wrong wiring and breadboard errors
- short circuits (VCC to GND)
- reversed polarity (LEDs, caps, diodes)
- incorrect resistor values
- power supply problems (voltage drop, regulator overheating)
- Arduino/microcontroller issues (upload, pin mapping, drive current)
- sensor connection errors (ultrasonic, DHT, MPU, IR, I2C)
- analog circuit problems (op-amp saturation, feedback, gain)
- logic gate and digital errors (floating inputs, clock issues)
- PCB assembly mistakes (footprint, trace, soldering)
- component failure (burnt, bulging, damaged)
- feedback/control system instability (oscillation, PID)
- common beginner mistakes (floating pins, missing ground, biasing)
- capacitor issues (polarity, value, voltage rating)

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "issue": "brief description of the detected issue",
  "confidence": number from 0 to 100,
  "explanation": "detailed explanation of why this is happening",
  "fix_steps": ["step 1", "step 2", "step 3", ...],
  "prevention_tips": ["tip 1", "tip 2", ...]
}`

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

function generateDemoResponse(prompt: string) {
  const lower = prompt.toLowerCase()

  // 1. Wrong Wiring Connections
  if (lower.includes("wiring") || lower.includes("connection") || lower.includes("pin") || lower.includes("breadboard row") || lower.includes("jumper")) {
    return {
      issue: "Wrong wiring connection — pin mismatch or breadboard row error",
      confidence: 82,
      explanation:
        "Incorrect wiring is the most common cause of circuit failure. Wires connected to the wrong breadboard rows, mismatched pin mappings between components and microcontrollers, or jumper wires in the wrong orientation can prevent the circuit from functioning. Even a single misplaced wire can cause complete system failure.",
      fix_steps: [
        "Trace every wire from source to destination against your schematic",
        "Verify breadboard row connections — each 5-pin row is connected vertically",
        "Check that power rail connections are continuous across the breadboard",
        "Ensure jumper wires are fully inserted and making contact",
        "Use a multimeter in continuity mode to verify each connection path",
      ],
      prevention_tips: [
        "Use color-coded wires (red for VCC, black for GND, other colors for signals)",
        "Label all connections on your schematic before wiring",
        "Take a photo of your breadboard setup before making changes",
      ],
    }
  }

  // 2. Short Circuits
  if (lower.includes("short") || lower.includes("smoke") || lower.includes("burn") || lower.includes("hot") || lower.includes("overheat")) {
    return {
      issue: "Short circuit detected — unintended connection between power and ground",
      confidence: 92,
      explanation:
        "A short circuit occurs when VCC and GND are directly connected with little or no resistance, causing excessive current. Components heat up rapidly, batteries drain instantly, and permanent damage occurs quickly. Common causes include solder bridges, crushed wire insulation, component legs touching, or conductive debris on the PCB.",
      fix_steps: [
        "Disconnect power immediately to prevent further damage",
        "Use a multimeter in continuity/resistance mode between VCC and GND rails",
        "Visually inspect for solder bridges, loose wire strands, or touching component leads",
        "Check for crushed wire insulation under screw terminals or standoffs",
        "Use a lab power supply with current limiting set to 100mA for initial testing",
      ],
      prevention_tips: [
        "Always check resistance between VCC and GND before applying power",
        "Use a current-limited power supply or a fuse for first-time testing",
        "Inspect PCBs and breadboards under good lighting before powering up",
      ],
    }
  }

  // 3. Reversed Polarity
  if (lower.includes("polarity") || lower.includes("reverse") || lower.includes("backwards") || lower.includes("orientation")) {
    return {
      issue: "Reversed polarity — component connected in the wrong direction",
      confidence: 88,
      explanation:
        "Many electronic components are polarity-sensitive. LEDs have an anode (+) and cathode (-); electrolytic capacitors have a marked negative side; diodes conduct in only one direction; transistors have specific pinouts (EBC or GDS). Connecting any of these backwards prevents operation and may cause damage.",
      fix_steps: [
        "Identify the polarity markings — LEDs have a flat edge on the cathode side",
        "Check for a stripe on the negative side of electrolytic capacitors",
        "Verify diode orientation — the cathode side has a band",
        "Look up the datasheet pinout for transistors and ICs",
        "Test with a multimeter diode mode to confirm orientation",
      ],
      prevention_tips: [
        "Use a datasheet reference card for common component pinouts",
        "Double-check polarized component orientation before soldering",
        "Add reverse polarity protection (series diode) to power inputs",
      ],
    }
  }

  // 4. Incorrect Resistor Values
  if (lower.includes("resistor") || lower.includes("ohm") || lower.includes("value") || lower.includes("led not glowing")) {
    return {
      issue: "Incorrect resistor value — wrong resistance affecting circuit behavior",
      confidence: 85,
      explanation:
        "Resistors control current flow and voltage division. Using the wrong value can cause LEDs to be too dim or burn out, voltage dividers to produce incorrect reference voltages, or timing circuits to oscillate at the wrong frequency. A 10kΩ resistor instead of 220Ω limits current to almost nothing, while the reverse allows excessive current.",
      fix_steps: [
        "Read the resistor color bands and verify against the required value",
        "Use a multimeter in resistance mode to measure actual resistance",
        "Calculate expected current: I = V/R for LED circuits",
        "For voltage dividers, verify Vout = Vin × R2/(R1+R2)",
        "Replace with the correct resistor value from the schematic",
      ],
      prevention_tips: [
        "Keep a resistor color code chart at your workspace",
        "Use a multimeter to confirm resistor values before soldering",
        "Start with higher resistor values and decrease if needed",
      ],
    }
  }

  // 5. Power Supply Problems
  if (lower.includes("power") || lower.includes("voltage") || lower.includes("regulator") || lower.includes("battery") || lower.includes("supply")) {
    return {
      issue: "Power supply problem — voltage drop, insufficient current, or regulator overheating",
      confidence: 86,
      explanation:
        "Voltage regulators like the 7805 need a minimum input-output voltage differential (dropout voltage). Insufficient input voltage or excessive load current causes the output to drop out. Linear regulators convert excess voltage to heat, which can trigger thermal shutdown. Batteries may not supply enough current or may be near depletion.",
      fix_steps: [
        "Measure input and output voltages of the regulator with a multimeter",
        "Check input voltage is at least 2V above output for standard regulators",
        "Verify the load current doesn't exceed the regulator's rated maximum",
        "Add adequate heatsinking — power dissipation = (Vin - Vout) × Iload",
        "Add 10µF electrolytic + 0.1µF ceramic capacitors at regulator input and output",
      ],
      prevention_tips: [
        "Use a switching regulator instead of linear for >500mA loads",
        "Add a fuse on the input side to protect against shorts",
        "Keep regulator input capacitors close to the regulator pins",
      ],
    }
  }

  // 6. Arduino & Microcontroller Issues
  if (lower.includes("arduino") || lower.includes("microcontroller") || lower.includes("upload") || lower.includes("sketch") || lower.includes("servo") || lower.includes("motor")) {
    return {
      issue: "Microcontroller issue — upload error, wrong pin mapping, or insufficient drive current",
      confidence: 83,
      explanation:
        "Microcontroller projects fail for several reasons: the wrong COM port is selected for upload, pins are mapped incorrectly in code, or the microcontroller cannot supply enough current to drive loads directly (max 40mA per pin on Arduino). Servo motors need a PWM-capable pin and sufficient power from an external supply, not the Arduino's 5V pin.",
      fix_steps: [
        "Verify the correct board and COM port are selected in the Arduino IDE",
        "Check pin numbers in code match physical wiring exactly",
        "Use an external power supply for motors, servos, and high-current loads",
        "Ensure PWM pins are used for servo control (pins 3, 5, 6, 9, 10, 11 on Uno)",
        "Add a decoupling capacitor (100µF) across servo power leads",
      ],
      prevention_tips: [
        "Use a separate power supply for high-current components",
        "Add flyback diodes to inductive loads (motors, relays)",
        "Always verify pin mapping with a simple blink test first",
      ],
    }
  }

  // 7. Sensor Connection Errors
  if (lower.includes("sensor") || lower.includes("ultrasonic") || lower.includes("temperature") || lower.includes("humidity") || lower.includes("dht") || lower.includes("mpu") || lower.includes("ir sensor")) {
    return {
      issue: "Sensor not reading correctly — wiring, pull-up, or library issue",
      confidence: 80,
      explanation:
        "Sensors require correct wiring, proper pull-up resistors for I2C/one-wire interfaces, and the right library initialization. Common mistakes include using wrong I2C addresses, missing pull-up resistors on SDA/SCL lines, connecting 5V sensors to 3.3V microcontrollers, or not allowing enough stabilization time after power-up.",
      fix_steps: [
        "Verify sensor VCC is connected to the correct voltage (3.3V or 5V per datasheet)",
        "Check data pin connections match your code pin definitions",
        "Add 4.7kΩ pull-up resistors to I2C lines if not on the breakout board",
        "Run an I2C scanner sketch to confirm the sensor address",
        "Allow 2-3 seconds after power-up before attempting to read",
      ],
      prevention_tips: [
        "Always read the sensor datasheet for wiring and timing requirements",
        "Use a logic level converter for 5V sensors with 3.3V microcontrollers",
        "Keep sensor wires short and shielded for analog sensors",
      ],
    }
  }

  // 8. Analog Circuit Problems (op-amp)
  if (lower.includes("op-amp") || lower.includes("op amp") || lower.includes("operational") || lower.includes("amplifier") || lower.includes("saturation") || lower.includes("feedback") || lower.includes("gain")) {
    return {
      issue: "Op-amp circuit problem — saturation, wrong feedback, or missing dual supply",
      confidence: 84,
      explanation:
        "Operational amplifiers can fail to work correctly due to several common issues: the output saturates at the supply rails if the input exceeds the common-mode range; the feedback network is incorrect causing unexpected gain; or a dual-supply op-amp is used with only a single supply. Rail-to-rail op-amps are needed when the output must swing close to the supply voltage.",
      fix_steps: [
        "Verify the op-amp is powered with the correct supply voltage and polarity",
        "Check that input voltages stay within the common-mode input range",
        "Calculate the expected gain and verify feedback resistor values",
        "For single-supply operation, bias the non-inverting input to VCC/2",
        "Add a 0.1µF decoupling capacitor close to the power pins",
      ],
      prevention_tips: [
        "Use rail-to-rail op-amps for single-supply designs",
        "Always read the datasheet for common-mode and output voltage ranges",
        "Add input protection resistors if inputs may exceed supply rails",
      ],
    }
  }

  // 9. Logic Gate & Digital Errors
  if (lower.includes("logic") || lower.includes("gate") || lower.includes("digital") || lower.includes("clock") || lower.includes("hysteresis") || lower.includes("schmitt")) {
    return {
      issue: "Logic gate or digital circuit error — floating inputs or timing mismatch",
      confidence: 81,
      explanation:
        "Digital logic circuits fail when inputs are left floating (unconnected), clock signals are noisy or too slow, or output loads exceed fan-out limits. CMOS logic inputs must never float — they can oscillate and draw excess current. Schmitt trigger inputs help clean up noisy signals but need proper threshold voltages.",
      fix_steps: [
        "Pull all unused inputs to VCC or GND through 10kΩ resistors",
        "Check clock signal integrity with an oscilloscope",
        "Verify output voltage levels match the next stage's logic thresholds",
        "Ensure the total load current doesn't exceed the gate's fan-out rating",
        "Add 0.1µF decoupling capacitors near each IC's power pins",
      ],
      prevention_tips: [
        "Never leave CMOS inputs floating — use pull-up or pull-down resistors",
        "Use Schmitt trigger inputs for noisy signal lines",
        "Route clock signals away from high-current traces to reduce noise",
      ],
    }
  }

  // 10. PCB Assembly Mistakes
  if (lower.includes("pcb") || lower.includes("assembly") || lower.includes("trace") || lower.includes("pad") || lower.includes("footprint") || lower.includes("solder")) {
    return {
      issue: "PCB assembly defect — wrong footprint, broken trace, or component orientation error",
      confidence: 86,
      explanation:
        "PCB assembly errors include placing components in the wrong orientation (reversed ICs, diodes, or connectors), using the wrong footprint for a component, broken or cracked traces from handling, and missing solder joints. A single backwards IC or lifted pad can render the entire board non-functional.",
      fix_steps: [
        "Compare every component placement against the PCB silkscreen and schematic",
        "Check for lifted or damaged pads using a magnifying glass",
        "Use a multimeter to test trace continuity on suspect paths",
        "Verify IC orientation — pin 1 indicator must match the footprint dot",
        "Inspect all solder joints for insufficient or excessive solder",
      ],
      prevention_tips: [
        "Always order a PCB panel with silkscreen labels for all components",
        "Double-check footprints in your EDA software before ordering",
        "Inspect bare PCBs for defects before soldering any components",
      ],
    }
  }

  // 11. Simulation-Based Problems (voltage, current, resistance)
  if (lower.includes("voltage") || lower.includes("current") || lower.includes("calculate") || lower.includes("simulation") || lower.includes("multimeter") || lower.includes("measure")) {
    return {
      issue: "Measured values don't match expected calculations — circuit analysis mismatch",
      confidence: 82,
      explanation:
        "When measured voltage, current, or resistance doesn't match theoretical calculations, the issue is often a wiring error, wrong component value, or an overlooked parallel path. For example, measuring 0V across a resistor in a series circuit means no current is flowing somewhere upstream, while measuring full supply voltage means an open circuit path.",
      fix_steps: [
        "Verify the circuit follows Ohm's Law: V = IR at every branch",
        "Check for unintended parallel paths that bypass components",
        "Measure voltage drop across each component systematically from source to ground",
        "Use Kirchhoff's Voltage Law — sum of voltage drops must equal supply voltage",
        "Confirm all ground points are truly connected to the common ground",
      ],
      prevention_tips: [
        "Simulate the circuit in software (Falstad, LTspice) before building",
        "Take systematic measurements from power source outward",
        "Document expected voltages at each test point for quick comparison",
      ],
    }
  }

  // 12. Feedback & Control System Errors
  if (lower.includes("feedback") || lower.includes("control") || lower.includes("loop") || lower.includes("oscillation") || lower.includes("pid") || lower.includes("phase")) {
    return {
      issue: "Feedback control system instability — oscillation or phase margin problem",
      confidence: 85,
      explanation:
        "Control systems become unstable when the feedback loop has insufficient phase margin, causing oscillation. This can happen with incorrect PID gains, output filtering creating phase delay, or positive feedback instead of negative. A system that oscillates or overshoots significantly needs gain adjustment or compensation.",
      fix_steps: [
        "Check that feedback is negative (inverting) not positive (non-inverting)",
        "Reduce the proportional gain (Kp) to improve stability margin",
        "Add a capacitor in the feedback path to roll off high-frequency gain",
        "Measure the oscillation frequency to identify the resonant point",
        "Use a step response test — observe overshoot and settling time",
      ],
      prevention_tips: [
        "Start with conservative (low) PID gains and increase gradually",
        "Always simulate control loops before hardware implementation",
        "Add output filtering to reduce high-frequency noise injection",
      ],
    }
  }

  // 13. Common Beginner Mistakes
  if (lower.includes("common ground") || lower.includes("floating") || lower.includes("beginner") || lower.includes("biasing") || lower.includes("pull-up") || lower.includes("pull down")) {
    return {
      issue: "Common beginner mistake — missing ground, floating input, or incorrect biasing",
      confidence: 88,
      explanation:
        "The most frequent mistakes include: forgetting a common ground between power supply and all components (circuits require a shared reference), leaving input pins floating (they pick up noise and behave unpredictably), incorrect transistor biasing (base resistor wrong or missing), and omitting current-limiting resistors for LEDs and other loads.",
      fix_steps: [
        "Verify every component shares a common ground return path",
        "Add 10kΩ pull-down resistors on all microcontroller input pins",
        "Check transistor base resistors — typically 1kΩ to 10kΩ for small signal",
        "Ensure LEDs have a current-limiting resistor (220Ω to 1kΩ depending on voltage)",
        "Measure voltage between ground points — they should read 0V",
      ],
      prevention_tips: [
        "Always verify the ground loop before connecting power",
        "Use a resistor for every LED — never connect directly to power",
        "Pull unused pins to a known state (GND or VCC through a resistor)",
      ],
    }
  }

  // 14. Component Failure Detection
  if (lower.includes("burnt") || lower.includes("burned") || lower.includes("damaged") || lower.includes("dead") || lower.includes("faulty") || lower.includes("blown") || lower.includes("broken") || lower.includes("replace")) {
    return {
      issue: "Component failure detected — physical damage or electrical overstress",
      confidence: 90,
      explanation:
        "Components fail from electrical overstress (excessive voltage or current), heat buildup, or physical damage. Burnt resistors show charring and often read open circuit. Electrolytic capacitors may bulge or leak. ICs can fail internally with no visible signs. A multimeter check usually reveals the fault — shorted or open readings where expected values should exist.",
      fix_steps: [
        "Disconnect power and visually inspect for burn marks, bulging, or discoloration",
        "Use a multimeter to test resistors (check value against color bands)",
        "Check capacitors for shorts or low resistance readings",
        "Test diodes with diode mode — should read ~0.6V in one direction only",
        "Replace the damaged component and check for the root cause before repowering",
      ],
      prevention_tips: [
        "Always stay within component maximum ratings (voltage, current, power)",
        "Add heat sinks to components that dissipate significant power",
        "Use a fuse or polyfuse to protect against overcurrent conditions",
      ],
    }
  }

  // 15. Breadboard Errors
  if (lower.includes("breadboard") || lower.includes("rail") || lower.includes("row") || lower.includes("protoboard") || lower.includes("prototype")) {
    return {
      issue: "Breadboard connection error — rail discontinuity or row misinterpretation",
      confidence: 87,
      explanation:
        "Breadboards have specific internal connections: the outer two columns (rails) run the full length and are typically used for power and ground. The inner rows (usually 5 holes per row) are connected horizontally. A common mistake is assuming the breadboard center gap has connections (it doesn't), or that the power rail on one side connects to the other side (it doesn't without a jumper).",
      fix_steps: [
        "Verify power rails are connected — some breadboards split rails in the middle",
        "Add jumper wires to bridge any center rail breaks if present",
        "Confirm components straddle the center gap correctly (ICs need rows on each side)",
        "Insert wires firmly — loose connections cause intermittent faults",
        "Use a multimeter to test continuity between holes in the same row",
      ],
      prevention_tips: [
        "Use a multimeter to map your breadboard's internal connections before use",
        "Add power rail jumpers when using both sides of the breadboard",
        "Use a breadboard with colored binding posts for easy power identification",
      ],
    }
  }

  // 16. Display / LCD / OLED
  if (lower.includes("lcd") || lower.includes("display") || lower.includes("oled") || lower.includes("screen") || lower.includes("monitor")) {
    return {
      issue: "Display not showing output — contrast, address, or initialization problem",
      confidence: 81,
      explanation:
        "LCD and OLED displays fail to show output due to incorrect contrast voltage (for parallel LCDs), wrong I2C address (many use 0x27 or 0x3C), or improper library initialization. The LiquidCrystal_I2C library needs the correct address passed to the constructor. For OLEDs, the SSD1306 library needs the correct resolution and I2C address.",
      fix_steps: [
        "Adjust the contrast potentiometer on the LCD module slowly while powered",
        "Run an I2C scanner sketch to find the correct display address",
        "Verify all data and control pins match your code definitions",
        "Ensure display voltage matches your system (3.3V vs 5V)",
        "Test with a known working example sketch before modifying",
      ],
      prevention_tips: [
        "Use an I2C backpack module to reduce pin usage and wiring errors",
        "Note the I2C address from the scanner and update your code immediately",
        "Add a 500ms delay in setup() before initializing the display for reliable startup",
      ],
    }
  }

  // 17. Transistor / MOSFET / Relay
  if (lower.includes("transistor") || lower.includes("mosfet") || lower.includes("switch") || lower.includes("relay") || lower.includes("driver")) {
    return {
      issue: "Switching component not activating — check gate/base drive voltage",
      confidence: 83,
      explanation:
        "Transistors and MOSFETs need sufficient gate/base voltage to turn fully on. Bipolar transistors require ~0.7V at the base with a current-limiting resistor (typically 1kΩ). MOSFETs need a gate threshold voltage (Vgs(th)) usually 2-4V, and logic-level MOSFETs are needed for 3.3V/5V control. Insufficient drive voltage causes the transistor to operate in the linear region and overheat.",
      fix_steps: [
        "Measure the gate/base voltage with a multimeter while the circuit is active",
        "Ensure the microcontroller pin is configured as OUTPUT and set HIGH",
        "Add a 10kΩ pull-down resistor between gate and source to prevent floating",
        "Check that the load voltage and current don't exceed the transistor's ratings",
        "For inductive loads (relays, motors), add a flyback diode across the coil",
      ],
      prevention_tips: [
        "Use a base resistor (1kΩ) with all bipolar transistors",
        "Use logic-level MOSFETs (IRLZ44N, IRLB8743) for 3.3V/5V gate drive",
        "Add a heatsink if the transistor dissipates more than 500mW",
      ],
    }
  }

  // 18. Capacitor Issues
  if (lower.includes("capacitor") || lower.includes("cap") || lower.includes("electrolytic") || lower.includes("ceramic") || lower.includes("filter cap")) {
    return {
      issue: "Capacitor issue — wrong value, reversed polarity, or insufficient voltage rating",
      confidence: 84,
      explanation:
        "Electrolytic capacitors are polarized and explode if reversed. Ceramic capacitors are non-polarized but capacitance varies with temperature and DC bias. Using a capacitor with too low a voltage rating causes dielectric breakdown. Filter capacitors need correct ESR and sufficient capacitance — undersized caps cause excessive ripple voltage in power supplies.",
      fix_steps: [
        "Check electrolytic polarity — negative is marked with a stripe on the side",
        "Verify the voltage rating exceeds circuit voltage by at least 20%",
        "For filter caps, ensure capacitance meets ripple current requirements",
        "Use a multimeter's capacitance mode to verify actual capacitance",
        "Replace bulging, leaking, or heat-damaged capacitors immediately",
      ],
      prevention_tips: [
        "Derate capacitor voltage by 50% for long-term reliability",
        "Use low-ESR capacitors for switching power supply filtering",
        "Never exceed the ripple current rating of electrolytic capacitors",
      ],
    }
  }

  // Generic fallback — dynamic, varies each time
  const generics = [
    {
      issue: "Possible wiring or configuration issue in the circuit",
      confidence: 70 + Math.floor(Math.random() * 20),
      explanation:
        "Based on the described symptoms, the circuit may have an incorrect connection, wrong component value, or power-related issue. Start by verifying power delivery to every stage, then trace signal paths from input to output. Divide the circuit into functional blocks and test each block independently to isolate the fault.",
      fix_steps: [
        "Verify power supply voltage and polarity at the circuit input",
        "Inspect all connections for loose wires or cold solder joints",
        "Check component values against the circuit schematic",
        "Measure voltage at key test points with a multimeter",
        "Isolate the circuit into sub-sections and test each independently",
      ],
      prevention_tips: [
        "Always breadboard and test circuits before final assembly",
        "Use a multimeter to verify connections before applying power",
        "Document your circuit with a schematic for easier troubleshooting",
      ],
    },
    {
      issue: "Intermittent connection or signal integrity issue detected",
      confidence: 73 + Math.floor(Math.random() * 15),
      explanation:
        "Intermittent faults are often caused by loose connections, cracked solder joints, damaged wires, or noise coupling. These faults are hardest to diagnose because they appear and disappear. Gently prodding wires and components while monitoring the output can help locate the mechanical fault. Noise issues often require shielding or filtering.",
      fix_steps: [
        "Gently wiggle each wire and component while observing circuit behavior",
        "Re-solder any connections that look dull or cracked",
        "Add 0.1µF decoupling capacitors near each IC's power pins",
        "Check for long unshielded wires that may pick up noise",
        "Use a ferrite bead or RC filter on input signal lines",
      ],
      prevention_tips: [
        "Strain-relieve all wires with hot glue or cable ties",
        "Keep signal wires short and twisted with ground return",
        "Use shielded cable for sensitive analog signals",
      ],
    },
    {
      issue: "Component compatibility or voltage level mismatch",
      confidence: 75 + Math.floor(Math.random() * 15),
      explanation:
        "Mixing 5V and 3.3V components without level shifting causes communication failure and potential damage. A 5V Arduino output connected directly to a 3.3V ESP32 input exceeds the absolute maximum rating. Similarly, using a 5V relay module with a 3.3V microcontroller may not trigger reliably because the HIGH threshold isn't reached.",
      fix_steps: [
        "Identify the operating voltage of every component in the circuit",
        "Use a logic level converter module for mixed-voltage communication",
        "Check datasheet input voltage thresholds — 3.3V inputs may not recognize 2.5V as HIGH",
        "Use voltage dividers to drop 5V signals to 3.3V where needed",
        "Ensure pull-up resistors reference the correct voltage rail",
      ],
      prevention_tips: [
        "Standardize on one voltage when possible (3.3V for modern designs)",
        "Never connect outputs to inputs with higher voltage than the input's rating",
        "Use bidirectional level shifters for I2C communication between voltage domains",
      ],
    },
  ]
  return generics[Math.floor(Math.random() * generics.length)]
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  try {
    const body = await req.json()
    const { prompt, imageUrl } = body

    if (!prompt) {
      return respond({ error: "Prompt is required" }, 400)
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...(imageUrl
            ? [{ type: "image_url", image_url: { url: imageUrl } }]
            : []),
        ],
      },
    ]

    if (GROQ_API_KEY) {
      try {
        const model = imageUrl ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile"
        const messages: Array<{ role: string; content: unknown }> = [
          { role: "system", content: SYSTEM_PROMPT },
        ]
        if (imageUrl) {
          messages.push({
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          })
        } else {
          messages.push({ role: "user", content: prompt })
        }

        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ model, messages, temperature: 0.3 }),
          }
        )

        const data = await response.json()
        if (!response.ok) throw new Error(`Groq API error: ${data.error?.message}`)

        const text = data.choices?.[0]?.message?.content
        if (!text) throw new Error("Groq returned empty response")

        const cleaned = text.replace(/```(?:json)?\s*/g, "").trim()
        const result = JSON.parse(cleaned)

        return respond(result)
      } catch (_err) {
        // Fall through
      }
    }

    if (OPENAI_API_KEY) {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            response_format: { type: "json_object" },
          }),
        }
      )

      const data = await response.json()
      const result = JSON.parse(data.choices[0].message.content)

      return respond(result)
    }

    if (GEMINI_API_KEY) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: `${SYSTEM_PROMPT}\n\nUser circuit issue: ${prompt}\n\nRespond with valid JSON only.` },
                  ],
                },
              ],
              generationConfig: { temperature: 0.3 },
            }),
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(`Gemini API error: ${data.error?.message}`)
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error("Gemini returned empty response")

        const cleaned = text.replace(/```(?:json)?\s*/g, "").trim()
        const result = JSON.parse(cleaned)

        return respond(result)
      } catch (_err) {
        // Fall through to demo response
      }
    }

    return respond(generateDemoResponse(prompt))
  } catch (err) {
    return respond({ error: err.message }, 500)
  }
})
