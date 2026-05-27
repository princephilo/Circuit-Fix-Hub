import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")

const SYSTEM_PROMPT = `You are an expert electronics troubleshooting AI for Circuit Fix Hub. The user's message may include an image URL of their circuit — use it if present.

Analyze the circuit issue described by the user. Identify EVERY possible error. Detect ALL of these problem types:
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

Return ONLY valid JSON with this exact structure (no markdown, no code fences). List ALL issues found, not just one:
{
  "issues": [
    {
      "issue": "specific error description",
      "confidence": number 0-100,
      "explanation": "why this error occurs",
      "fix_steps": ["step 1", "step 2", ...],
      "category": "wiring/short/polarity/resistor/power/microcontroller/sensor/opamp/logic/pcb/component/feedback/beginners/capacitor"
    }
  ],
  "overall_summary": "brief overall assessment of the circuit",
  "overall_confidence": number 0-100
}`

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

    if (!GROQ_API_KEY) {
      return respond({ error: "GROQ_API_KEY not configured" }, 500)
    }

    let enrichedPrompt = `Circuit issue to diagnose: ${prompt}\n\nIdentify EVERY single error in this circuit. List all problems you find, not just the most obvious one. Be thorough and check every possible failure point.`
    if (imageUrl) {
      enrichedPrompt += `\n\nThe user also uploaded an image of their circuit at this URL: ${imageUrl}`
    }

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
            { role: "user", content: enrichedPrompt },
          ],
          temperature: 0.5,
        }),
      }
    )

    const data = await response.json()
    if (!response.ok) {
      throw new Error(`Groq API error: ${data.error?.message}`)
    }

    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error("Groq returned empty response")

    const cleaned = text.replace(/```(?:json)?\s*/g, "").trim()
    const result = JSON.parse(cleaned)

    return respond(result)
  } catch (err) {
    return respond({ error: `Analysis failed: ${err.message}` }, 500)
  }
})
