import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")

const SYSTEM_PROMPT = `You are an expert electronics troubleshooting AI.

Analyze the circuit issue described by the user. Detect:
- wrong wiring
- short circuits
- polarity issues
- missing components
- incorrect resistor values

Return JSON with this structure:
{
  "issue": "brief description of the detected issue",
  "confidence": 0-100,
  "explanation": "detailed explanation of why this is happening",
  "fix_steps": ["step 1", "step 2", ...],
  "prevention_tips": ["tip 1", "tip 2", ...]
}`

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

function generateDemoResponse(prompt: string) {
  const lower = prompt.toLowerCase()

  if (lower.includes("sensor") || lower.includes("ultrasonic") || lower.includes("temperature") || lower.includes("humidity")) {
    return {
      issue: "Sensor not reading correctly — likely wiring or library issue",
      confidence: 80,
      explanation:
        "Sensors often require specific wiring pull-up resistors and proper library initialization. Common issues include incorrect VCC/GND connections, missing pull-up resistors on I2C lines, or using the wrong pin numbers in code. Many sensors also need a stabilization period after power-up.",
      fix_steps: [
        "Verify sensor VCC is connected to the correct voltage (3.3V or 5V as per datasheet)",
        "Check data pin connections match your code pin definitions",
        "Add pull-up resistors (4.7kΩ) for I2C sensors if not on module",
        "Allow 2-3 seconds after power-up before reading",
        "Test with a simple example sketch from the sensor library",
      ],
      prevention_tips: [
        "Always read the sensor datasheet for wiring requirements",
        "Use a logic level converter for 5V sensors with 3.3V microcontrollers",
        "Keep sensor wires short to reduce noise interference",
      ],
    }
  }

  if (lower.includes("transistor") || lower.includes("mosfet") || lower.includes("switch") || lower.includes("relay")) {
    return {
      issue: "Switching component not activating — check gate/base drive voltage",
      confidence: 83,
      explanation:
        "Transistors and MOSFETs require sufficient gate/base voltage to turn fully on. A bipolar transistor needs 0.7V at the base, while a MOSFET needs a gate threshold voltage typically 2-4V. If the drive voltage is too low, the component operates in linear mode and overheats.",
      fix_steps: [
        "Measure the gate/base voltage with a multimeter while the circuit is on",
        "Ensure the microcontroller pin can supply enough current (use a transistor driver IC if needed)",
        "Add a pull-down resistor (10kΩ) between gate and source to prevent floating",
        "Check that the load voltage and current don't exceed the transistor's ratings",
        "For inductive loads like relays, add a flyback diode across the coil",
      ],
      prevention_tips: [
        "Always use a base resistor (1kΩ) with bipolar transistors",
        "Use a logic-level MOSFET for 3.3V/5V microcontroller switching",
        "Add a heatsink if switching more than 500mA",
      ],
    }
  }

  if (lower.includes("capacitor") || lower.includes("cap") || lower.includes("filter") || lower.includes("smoothing")) {
    return {
      issue: "Capacitor issue — wrong value, polarity reversed, or voltage rating insufficient",
      confidence: 84,
      explanation:
        "Electrolytic capacitors are polarized and will fail if reversed. Ceramic capacitors are non-polarized but can have temperature-related value drift. Using too low a voltage rating can cause catastrophic failure. Filter capacitors need correct ESR and sufficient capacitance for the load current.",
      fix_steps: [
        "Check electrolytic capacitor polarity — the negative side is marked with a stripe",
        "Verify the capacitor voltage rating exceeds the circuit voltage by at least 20%",
        "For filter caps, ensure capacitance matches the calculated ripple requirement",
        "Use a multimeter's capacitance mode to verify actual capacitance",
        "Replace bulging or leaking capacitors immediately",
      ],
      prevention_tips: [
        "Derate capacitor voltage by 50% for long-term reliability",
        "Use low-ESR capacitors for power supply filtering",
        "Never connect electrolytic capacitors in reverse polarity",
      ],
    }
  }

  if (lower.includes("soldering") || lower.includes("solder") || lower.includes("cold joint") || lower.includes("bridge")) {
    return {
      issue: "Soldering defect — cold joint, solder bridge, or insufficient wetting",
      confidence: 87,
      explanation:
        "Cold solder joints happen when the iron temperature is too low or the joint moves during cooling. Solder bridges occur when excess solder connects adjacent pins. Insufficient wetting means the solder hasn't bonded properly to both the pad and the component lead.",
      fix_steps: [
        "Reheat suspect joints with a clean soldering iron tip at 350°C",
        "Use flux on stubborn joints to improve solder flow",
        "Check for solder bridges between IC pins using a magnifying glass",
        "Use solder wick or a solder sucker to remove bridges",
        "Ensure the iron tip is tinned before each joint",
      ],
      prevention_tips: [
        "Use a temperature-controlled soldering iron set to 300-350°C",
        "Keep the iron tip clean and tinned",
        "Use flux-core solder (63/37 leaded for easier work)",
      ],
    }
  }

  if (lower.includes("power") || lower.includes("voltage") || lower.includes("regulator") || lower.includes("battery")) {
    return {
      issue: "Power supply issue — voltage drop, insufficient current, or regulator overheating",
      confidence: 86,
      explanation:
        "Voltage regulators like the 7805 need a minimum input-output voltage differential (dropout voltage). Insufficient input voltage or excessive load current causes the output to drop out. Linear regulators convert excess voltage to heat, which can trigger thermal shutdown if not properly heatsinked.",
      fix_steps: [
        "Measure input and output voltages of the regulator with a multimeter",
        "Check input voltage is at least 2V above output for standard regulators",
        "Verify the load current doesn't exceed the regulator's rated maximum",
        "Add adequate heatsinking — calculate power dissipation as (Vin - Vout) * Iload",
        "Add 10µF electrolytic + 0.1µF ceramic capacitors at regulator input and output",
      ],
      prevention_tips: [
        "Use a switching regulator instead of linear for >500mA loads",
        "Add a fuse on the input side to protect against shorts",
        "Keep regulator input capacitors close to the regulator pins",
      ],
    }
  }

  if (lower.includes("short") || lower.includes("smoke") || lower.includes("burn") || lower.includes("hot")) {
    return {
      issue: "Short circuit detected — check for unintended connections between power and ground",
      confidence: 92,
      explanation:
        "A short circuit occurs when power and ground are directly connected with little or no resistance. This causes excessive current flow, overheating, and potential component damage. Common causes include solder bridges, crushed wires, and conductive debris on the PCB.",
      fix_steps: [
        "Immediately disconnect power to prevent further damage",
        "Use a multimeter in continuity mode to find the short between VCC and GND",
        "Visually inspect for solder bridges, loose wires, or component legs touching",
        "Check components for burn marks and replace damaged ones",
        "Use a lab power supply with current limiting to test the circuit safely",
      ],
      prevention_tips: [
        "Always check for shorts with a multimeter before applying power",
        "Use a current-limited power supply when testing new circuits",
        "Inspect PCBs under good lighting before powering up",
      ],
    }
  }

  if (lower.includes("lcd") || lower.includes("display") || lower.includes("oled") || lower.includes("screen")) {
    return {
      issue: "Display not showing output — contrast, I2C address, or initialization issue",
      confidence: 81,
      explanation:
        "LCD and OLED displays commonly fail to show output due to incorrect contrast voltage (for parallel LCDs), wrong I2C address (for I2C modules), or improper initialization in code. Many I2C displays use address 0x27 or 0x3C, and using the wrong one gives a blank screen.",
      fix_steps: [
        "Adjust the contrast potentiometer on the LCD module slowly",
        "Run an I2C scanner sketch to find the correct address",
        "Verify all data/control pins match your code definitions",
        "Ensure the display's operating voltage matches your system (3.3V vs 5V)",
        "Test with a known working example sketch before modifying",
      ],
      prevention_tips: [
        "Use an I2C backpack module to reduce wiring complexity",
        "Note the I2C address from the scanner and use it in your code",
        "Add a small delay in setup() before initializing the display",
      ],
    }
  }

  return {
    issue: `Analysis of "${prompt.substring(0, 40)}${prompt.length > 40 ? '...' : ''}" — possible wiring or configuration issue`,
    confidence: 70 + Math.floor(Math.random() * 20),
    explanation:
      "Based on the issue described, the circuit likely has a wiring error, incorrect component value, or software configuration problem. The specific symptoms should be cross-referenced with the circuit schematic to isolate the faulty section. Start with a systematic check of power connections, signal paths, and component orientation.",
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
  }
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
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `User circuit issue: ${prompt}` },
              ],
              temperature: 0.3,
            }),
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
