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

  if (lower.includes("led") || lower.includes("light") || lower.includes("glow")) {
    return {
      issue: "LED not glowing — likely incorrect polarity or insufficient current",
      confidence: 85,
      explanation:
        "LEDs are polarity-sensitive components. The anode (+) must connect to the positive supply through a current-limiting resistor. If the LED is reversed or the resistor value is too high, the LED won't light up. Typical forward voltage is 2V and current should be 10-20mA.",
      fix_steps: [
        "Check LED polarity — anode (long leg) to positive, cathode (short leg) to ground",
        "Verify the current-limiting resistor value using Ohm's Law: R = (V_supply - V_LED) / I",
        "Ensure the resistor is placed between the positive supply and the LED anode",
        "Measure voltage across the LED with a multimeter — should read ~2V when lit",
        "If still not glowing, test the LED with a 3V coin cell battery directly",
      ],
      prevention_tips: [
        "Always use a current-limiting resistor with LEDs (typically 220Ω–1kΩ for 5V)",
        "Double-check polarity before soldering or connecting",
        "Use a breadboard for prototyping before final assembly",
      ],
    }
  }

  if (lower.includes("motor") || lower.includes("spinning") || lower.includes("servo")) {
    return {
      issue: "Motor not spinning — insufficient power or incorrect driver wiring",
      confidence: 82,
      explanation:
        "Motors draw significantly more current than what microcontroller pins can supply. A motor driver IC (like L298N or L293D) or a transistor is required. Common issues include insufficient power supply, incorrect enable pin connections, or PWM signal misconfiguration.",
      fix_steps: [
        "Verify the motor driver is receiving proper power (5V or 12V as required)",
        "Check that the enable pins on the motor driver are connected to HIGH (or PWM)",
        "Ensure the microcontroller ground and motor driver ground are common",
        "Test the motor directly with a battery to confirm it's functional",
        "For servo motors, verify the PWM signal frequency is correct (50Hz)",
      ],
      prevention_tips: [
        "Never connect a motor directly to a microcontroller pin",
        "Use flyback diodes across DC motor terminals to prevent voltage spikes",
        "Add a large capacitor (100µF+) across the motor power supply",
      ],
    }
  }

  if (lower.includes("arduino") || lower.includes("board") || lower.includes("not working") || lower.includes("dead")) {
    return {
      issue: "Arduino board unresponsive — possible power issue or short circuit",
      confidence: 78,
      explanation:
        "An unresponsive Arduino board is often caused by insufficient power, a short circuit on the breadboard, a blown voltage regulator, or the wrong board/port selected in the IDE. The onboard LED (pin 13) helps diagnose if the microcontroller is running.",
      fix_steps: [
        "Check that the power LED on the Arduino is lit",
        "Disconnect all external components and test with a bare board",
        "Try a different USB cable and port — data cables matter",
        "Select the correct board type and COM port in the Arduino IDE",
        "Upload a simple Blink sketch to verify the board works",
      ],
      prevention_tips: [
        "Always disconnect power when making wiring changes",
        "Use a USB isolator for protection against shorts",
        "Keep a spare Arduino for quick troubleshooting",
      ],
    }
  }

  return {
    issue: "Possible wiring error or component mismatch detected in the circuit",
    confidence: 72,
    explanation:
      "The circuit may have a wiring error such as a loose connection, incorrect component placement, or a mismatch between the expected and actual component values. Check all connections systematically.",
    fix_steps: [
      "Visually inspect all connections on the breadboard",
      "Verify component values match the circuit schematic",
      "Check for cold solder joints if using a perfboard",
      "Use a multimeter in continuity mode to trace connections",
      "Compare your wiring against a known-working schematic or tutorial",
    ],
    prevention_tips: [
      "Use a breadboard diagram or schematic before starting",
      "Label all wires with their connections",
      "Take photos of working circuits for reference",
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
