/**
 * jobcard-ai-worker  (v2)
 *
 * Input  (POST JSON) from the web app's Step 1:
 *   equipmentName   - Equipment Description (e.g. "Retail Fuel Dispenser - Diesel Side")
 *   workType        - Type of Work
 *   reportedProblem - Reported Problem / Reason for Visit
 *   equipType, equipId, client (optional context)
 *
 * Output: JSON used to fill the web app's Steps 3-8
 *   Step 3 scope, Step 4 findings, Step 5 QC, Step 6 parts,
 *   Step 7 recommendations, Step 8 final status.
 *
 * SETUP (once):
 *   wrangler secret put GROQ_API_KEY          (or Dashboard > Worker > Settings > Variables > Secret)
 *   Optional variables: GROQ_MODEL, ALLOWED_ORIGIN
 */

const DEFAULT_MODEL = "openai/gpt-oss-20b";

// Must match the <option> values of #final-status in index.html exactly.
const FINAL_STATUSES = [
  "REPAIRED AND RETURNED TO SERVICE",
  "REPAIRED – AWAITING PARTS / FOLLOW-UP",
  "NOT REPAIRED – LOCKED OUT",
  "RETURNED TO SERVICE – NO DEFECT FOUND",
  "TEMPORARILY RETURNED TO SERVICE",
  "REPAIRED & APPROVED FOR SERVICE SUBJECT TO STATUTORY APPROVAL"
];

const SYSTEM_PROMPT = `You are a senior forecourt / industrial maintenance technician drafting a Job Card for Forecourt Works Ltd (Kenya).

You receive ONLY: the equipment name, the type of work, and the reported problem. From these, draft the technical sections of the Job Card as a professional first draft. The technician will review and edit it, so write what is typical and likely for this equipment, work type and problem.

Return ONLY valid JSON (no markdown, no commentary) with exactly this shape:

{
  "scopeSummary": "2-3 sentences describing the scope of work",
  "scopeSteps": "numbered steps, one per line: 1. ...\\n2. ...  (5 to 8 steps)",
  "deliverables": "bullet lines starting with '• ', one per line (3 to 5)",
  "findingsArrival": "1-2 sentences: arrival, induction, isolation / safe-state set-up",
  "findingsDiagnosis": "2-4 sentences: inspection and diagnosis relating to the reported problem",
  "findingsRootCause": "1-3 sentences: most likely root cause",
  "findingsAction": "2-4 sentences: corrective action taken",
  "findingsVerification": "1-3 sentences: functional and safety verification after the work",
  "qcIntro": "1 sentence",
  "qcRows": [
    { "inspection": "QC test name", "criteria": "acceptance criteria", "observation": "CONFORMING (C)" or "NON CONFORMING (NC)", "remarks": "short remark" }
  ],
  "qcConclusion": "1-2 sentences",
  "parts": [
    { "desc": "part name (generic, no invented part numbers)", "qty": "1", "status": "NEW" or "RECONDITIONED", "vendor": "", "installDate": "", "warrantyStart": "", "warrantyEnd": "" }
  ],
  "partsTraceability": "1 sentence on removed-part tagging and warranty records",
  "recommendations": "numbered list, 2 to 5 practical recommendations, one per line",
  "finalStatus": "one of: ${FINAL_STATUSES.join(" | ")}",
  "finalStatusText": "1-3 sentences stating the final condition of the equipment",
  "techDeclaration": "1-2 sentences, first person, confirming work was done to SOP and the equipment left safe"
}

Rules:
- 3 to 6 QC rows relevant to the equipment and problem. Use CONFORMING (C) when the problem is described as resolvable by this work; NON CONFORMING (NC) only if the defect would clearly remain.
- QC rows record POST-repair verification. The observation and remarks must agree: if CONFORMING (C), the remark states the satisfactory post-repair result and must NOT describe the original defect (e.g. never "meter reads 5% high" next to CONFORMING). Do not invent measured values or percentages.
- Spare parts: for any corrective, repair, replacement or fault-finding job, ALWAYS list the 2 to 6 parts that would normally be replaced to fix the reported problem, including the main component plus typical consumables (seals, O-rings, gaskets, filters, fuses, connectors) where relevant. Use generic names and qty "1" unless a different quantity is clearly typical. Return "parts": [] only for inspection, calibration, servicing or preventive work where no part is normally replaced.
- NEVER invent serial numbers, part numbers, vendor names, meter readings, measured values, dates or times. Leave vendor and date fields as empty strings.
- Pick finalStatus from the list above; default to "REPAIRED AND RETURNED TO SERVICE" unless the problem implies otherwise.
- Practical for a fuel station / industrial site in Kenya. Concise, professional, plain text only.
- Output JSON only.`;

export default {
  async fetch(request, env) {
    const cors = corsHeaders(env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return json({ ok: false, error: "Only POST allowed" }, 405, cors);
    }
    if (!env.GROQ_API_KEY) {
      return json({ ok: false, error: "Server not configured: GROQ_API_KEY secret is missing" }, 500, cors);
    }

    try {
      const body = await request.json().catch(() => ({}));

      // New field names, with the old ones still accepted
      const reportedProblem = clean(body.reportedProblem || body.problem, 1500);
      const equipmentName   = clean(body.equipmentName || body.equipDesc || body.equipment, 200);
      const workType        = clean(body.workType, 120);
      const equipType       = clean(body.equipType || body.equipmentType, 120);
      const equipId         = clean(body.equipId || body.assetId, 80);
      const client          = clean(body.client, 120);

      if (!reportedProblem) return json({ ok: false, error: "reportedProblem is required" }, 400, cors);
      if (!workType)        return json({ ok: false, error: "workType is required" }, 400, cors);
      if (!equipmentName && !equipType) {
        return json({ ok: false, error: "equipmentName is required" }, 400, cors);
      }

      const userPrompt = [
        `Equipment name: ${equipmentName || equipType}`,
        `Type of work: ${workType}`,
        `Reported problem: ${reportedProblem}`,
        equipType && equipmentName ? `Equipment category: ${equipType}` : null,
        equipId ? `Equipment ID: ${equipId}` : null,
        client ? `Client: ${client}` : null
      ].filter(Boolean).join("\n");

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.GROQ_MODEL || DEFAULT_MODEL,
          temperature: 0.3,
          // gpt-oss is a reasoning model: reasoning tokens count against this limit,
          // so keep it generous or the JSON gets cut off.
          max_completion_tokens: 4500,
          reasoning_effort: "low",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt }
          ]
        })
      });

      const groqBody = await groqRes.json().catch(() => ({}));
      if (!groqRes.ok) {
        const msg = groqBody.error?.message || groqBody.message || `Groq HTTP ${groqRes.status}`;
        return json({ ok: false, error: msg }, 502, cors);
      }

      const raw = groqBody.choices?.[0]?.message?.content || "";
      const parsed = parseJsonLoose(raw);
      if (!parsed) {
        return json({ ok: false, error: "Model returned invalid JSON" }, 502, cors);
      }

      return json({ ok: true, ...normalise(parsed), model: env.GROQ_MODEL || DEFAULT_MODEL }, 200, cors);

    } catch (err) {
      return json({ ok: false, error: err.message || String(err) }, 500, cors);
    }
  }
};

/* ---------- helpers ---------- */

function clean(v, max) {
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
}

/** Model output can be a string, an array of lines, or have stray fences: coerce to text. */
function text(v, max) {
  if (Array.isArray(v)) v = v.map(x => String(x)).join("\n");
  return String(v == null ? "" : v).replace(/\r/g, "").trim().slice(0, max);
}

function parseJsonLoose(raw) {
  try { return JSON.parse(raw); } catch (_) { /* fall through */ }
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) { /* ignore */ } }
  return null;
}

function normalise(p) {
  const qcRows = (Array.isArray(p.qcRows) ? p.qcRows : []).slice(0, 8).map(r => ({
    inspection: text(r.inspection, 200),
    criteria: text(r.criteria, 300),
    observation: /non/i.test(String(r.observation || "")) ? "NON CONFORMING (NC)" : "CONFORMING (C)",
    remarks: text(r.remarks, 200)
  })).filter(r => r.inspection);

  const parts = (Array.isArray(p.parts) ? p.parts : []).slice(0, 8).map(x => ({
    desc: text(x.desc, 200),
    qty: text(x.qty || "1", 10) || "1",
    status: /recond/i.test(String(x.status || "")) ? "RECONDITIONED" : "NEW",
    vendor: "",          // never trust AI-invented vendors
    installDate: "",
    warrantyStart: "",
    warrantyEnd: ""
  })).filter(x => x.desc);

  // Compare on letters/digits only so dash style, "&" vs "AND" and spacing don't matter
  const key = v => String(v || "").toUpperCase().replace(/&/g, "AND").replace(/[^A-Z0-9]/g, "");
  const finalStatus = FINAL_STATUSES.find(s => key(s) === key(p.finalStatus)) || FINAL_STATUSES[0];

  return {
    scopeSummary: text(p.scopeSummary, 800),
    scopeSteps: text(p.scopeSteps, 2000),
    deliverables: text(p.deliverables, 1000),
    findingsArrival: text(p.findingsArrival, 600),
    findingsDiagnosis: text(p.findingsDiagnosis, 1000),
    findingsRootCause: text(p.findingsRootCause, 800),
    findingsAction: text(p.findingsAction, 1000),
    findingsVerification: text(p.findingsVerification, 800),
    qcIntro: text(p.qcIntro, 400),
    qcRows,
    qcConclusion: text(p.qcConclusion, 500),
    parts,
    partsTraceability: text(p.partsTraceability, 500),
    recommendations: text(p.recommendations, 2000),
    finalStatus,
    finalStatusText: text(p.finalStatusText, 800),
    techDeclaration: text(p.techDeclaration, 600)
  };
}

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": (env && env.ALLOWED_ORIGIN) || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors }
  });
}
