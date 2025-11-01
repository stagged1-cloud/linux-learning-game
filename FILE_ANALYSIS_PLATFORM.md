# Phase 2: Advanced File Analysis Platform

## Executive Summary

After completing the Linux learning game (Phase 1), users will have the skills to work with complex system files. Phase 2 adds a powerful file analysis platform that allows users to upload logs, network captures (Wireshark), healthcare files (HL7, DICOM), and receive AI-powered analysis with multi-LLM consensus verification.

**Key Differentiator:** Instead of relying on a single AI model, multiple LLMs analyze the same file and reach consensus, providing confidence scores and weighted answers. This dramatically improves accuracy and trustworthiness.

---

## Vision

**Goal:** Create a GitHub-based, always-accessible file analysis engine that:
- Accepts log files, Wireshark captures, HL7 messages, DICOM images
- Analyzes them using 3+ LLMs simultaneously
- Reaches consensus on findings
- Provides confidence scores
- Offers human-readable explanations
- Persists results for audit trails
- Costs $0 to run (free tier APIs only)

---

## Architecture Overview

### Data Flow

```
User Upload
    ↓
[File Validation & Type Detection]
    ↓
[Extract relevant data from file]
    ↓
[Split analysis into subtasks]
    ↓
[Parallel LLM Analysis] ← Groq, Hugging Face, Claude API
    ↓
[Consensus Engine - Weighted Voting]
    ↓
[Confidence Scoring]
    ↓
[Result Aggregation]
    ↓
[Presentation + Export]
    ↓
[Database Storage for Audit]
```

---

## File Types & Parsers

### 1. Log Files (.log, .txt)

**Parser Purpose:** Extract structured information from unstructured logs

**Analysis Questions:**
- What is the time range of this log?
- What are the top 5 errors?
- What is the error frequency?
- Are there patterns in the errors?
- What caused the most recent critical event?
- Is there a root cause?

**Implementation:**
```javascript
// Parse log file into:
// - Timestamps
// - Log levels (ERROR, WARN, INFO, DEBUG)
// - Message content
// - Source (component/service)

// Group by patterns, time windows, severity
// Create summary statistics
```

**Consensus Questions:**
1. "What is the primary issue in this log?"
2. "What remediation steps do you recommend?"
3. "What monitoring would prevent this?"
4. "Rate severity: 1-10"

---

### 2. Wireshark Files (.pcap, .pcapng)

**Parser Purpose:** Extract network communication patterns

**Analysis Questions:**
- What protocols are present?
- What are the main data flows?
- Are there security concerns?
- What is the bandwidth pattern?
- Which hosts/ports are communicating?
- Are there anomalies?

**Implementation:**
```javascript
// Use pcap library to parse binary file
// Extract:
// - Protocol breakdown (TCP, UDP, ICMP, DNS, etc.)
// - IP pairs and communication flow
// - Port usage
// - Data volume per stream
// - Timing analysis
// - Payload summaries (where safe)

// Create network graph data
// Identify common ports and services
```

**Consensus Questions:**
1. "What is the primary purpose of this traffic?"
2. "Are there any security concerns?"
3. "What services are communicating?"
4. "Is there malicious activity?"
5. "Rate risk level: 1-10"

---

### 3. HL7 Messages (.hl7, .txt)

**Parser Purpose:** Interpret healthcare data standards

**Analysis Questions:**
- What type of HL7 message is this?
- What patient data is present?
- What are the critical values?
- Are there data quality issues?
- Is the message valid?

**Implementation:**
```javascript
// Parse HL7 segments (MSH, PID, OBX, etc.)
// Extract:
// - Message type and trigger event
// - Patient identifiers (MRN, demographics)
// - Observation/result values
// - Reference ranges and criticality
// - Timing information
// - Ordering providers

// Validate against HL7 standards
// Flag critical values
// Check for missing required fields
```

**Consensus Questions:**
1. "What is the clinical significance?"
2. "Are there critical values?"
3. "Are there data quality issues?"
4. "What action is required?"
5. "Rate data quality: 1-10"

---

### 4. DICOM Files (.dcm, .dicom)

**Parser Purpose:** Extract medical imaging metadata and basic image info

**Analysis Questions:**
- What type of study is this?
- What anatomical region?
- What modality (CT, MRI, XRay)?
- What are key parameters?
- Are there artifacts/quality issues?

**Implementation:**
```javascript
// Parse DICOM tags (using dcmjs or pydicom)
// Extract:
// - Study metadata (date, modality, body part)
// - Patient info (name, age, sex, ID)
// - Image parameters (window/level, bits allocated)
// - Series and image count
// - Acquisition parameters
// - Manufacturer and device info

// Note: Full AI analysis of DICOM requires medical ML models
// For now, extract metadata and basic stats only
// Flag for review if abnormal tags detected
```

**Consensus Questions:**
1. "Is this study complete?"
2. "Are there obvious quality issues?"
3. "What are the key parameters?"
4. "Any missing required metadata?"
5. "Rate completeness: 1-10"

---

## Multi-LLM Consensus Engine

### Architecture

```
File Analysis Request
    ↓
[Query 1] → LLM A (Groq) ─────┐
[Query 1] → LLM B (HF API) ────┼─→ [Consensus Engine]
[Query 1] → LLM C (Claude) ────┘
    ↓
[Weighted Voting]
    ↓
[Confidence Score Calculation]
    ↓
[Result Aggregation]
```

### LLM Selection (Free Tiers)

| Model | Provider | Free Tier | Speed | Accuracy | Rationale |
|-------|----------|-----------|-------|----------|-----------|
| **Llama 2 70B** | Groq | 25 req/min | Very Fast | High | Primary - specialized inference |
| **Mistral 7B** | Hugging Face | Unlimited | Fast | Medium-High | Fallback + cost diversity |
| **Claude 3 Haiku** | Anthropic | Via API | Medium | Very High | Premium consensus vote |

### Consensus Mechanism

**Weighted Voting System:**
```
Each LLM gets a weight based on:
- Accuracy on similar tasks (calibrated)
- Response confidence score
- Agreement with majority
- Response coherence and professionalism

Weight distribution example:
- Groq (40%) - Faster, reliable, specialized
- Hugging Face (35%) - Diverse perspective
- Claude (25%) - Tiebreaker, high quality

For each question:
1. Extract answer from each LLM response
2. Calculate similarity between answers
3. If agreement > 70%: Confidence HIGH, use majority
4. If agreement 40-70%: Confidence MEDIUM, provide all views
5. If agreement < 40%: Confidence LOW, flag for review
```

### Answer Extraction & Normalization

```javascript
// For structured questions:
answerA = {
  primary_issue: "Database connection timeout",
  severity: 8,
  confidence: 0.92
}

answerB = {
  primary_issue: "DB timeout - connection pool exhausted",
  severity: 9,
  confidence: 0.88
}

// Normalize and compare semantically
consensus = {
  answer: "Database connection pool exhaustion",
  severity: { values: [8, 9], median: 8.5, consensus: HIGH },
  confidence: 0.90,
  agreement_sources: [A, B],
  dissent: null
}
```

### Confidence Scoring

```
Confidence = (Agreement_Score * 0.6) + (Individual_Confidence * 0.4)

Where:
- Agreement_Score: How similar are the LLM responses? (0-1)
- Individual_Confidence: LLMs' own confidence scores (0-1)

Result: Confidence score 0-100
- 90-100: Act on this
- 70-89: Good, but verify
- 50-69: Consider multiple perspectives
- <50: Requires human review
```

---

## Database Schema (Phase 2)

```sql
-- Analysis sessions/jobs
CREATE TABLE analysis_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  file_name VARCHAR(255),
  file_type VARCHAR(50),  -- log, pcap, hl7, dicom
  file_size_bytes INT,
  upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  analysis_time_seconds DECIMAL,
  status VARCHAR(50)  -- pending, processing, completed, error
);

-- Individual LLM responses
CREATE TABLE llm_responses (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES analysis_sessions(id),
  llm_name VARCHAR(50),  -- groq, huggingface, claude
  question TEXT,
  response TEXT,
  confidence DECIMAL(3, 2),  -- 0.00 to 1.00
  response_time_seconds DECIMAL,
  tokens_used INT
);

-- Consensus results
CREATE TABLE consensus_results (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES analysis_sessions(id),
  question TEXT,
  final_answer TEXT,
  llm_votes JSONB,  -- { groq: answer_a, huggingface: answer_b, ... }
  confidence_score DECIMAL(5, 2),  -- 0 to 100
  agreement_percentage INT,
  consensus_reached BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Full analysis results
CREATE TABLE analysis_results (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES analysis_sessions(id),
  summary TEXT,
  findings JSONB,
  recommendations JSONB,
  risk_level INT,  -- 1-10
  exportable_format VARCHAR(50),  -- json, pdf, html
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## File Upload & Validation

### Size Limits (Free Tier Friendly)

```
Log files: ≤ 50MB
Wireshark captures: ≤ 100MB  
HL7 messages: ≤ 1MB
DICOM files: ≤ 200MB (single image)
```

### Validation Steps

```javascript
1. File size check ✓
2. File type verification (magic bytes) ✓
3. Parse sanity check (can parse?) ✓
4. Security scan (no malware signatures) ✓
5. Extract metadata ✓
6. Create analysis tasks ✓
```

### Chunking Strategy

For large files:
```
- Log files: Split by lines, analyze sections, aggregate findings
- Wireshark: Analyze packet windows, aggregate patterns
- HL7: Analyze by message, aggregate summaries
- DICOM: Analyze each file independently (already binary)
```

---

## User Workflow (Phase 2)

```
1. User logs in (Phase 1 trained them)
2. Navigate to "File Analysis" section
3. Click "Upload File"
4. Select file type dropdown (log/pcap/hl7/dicom)
5. Upload file
6. System shows:
   - File processed ✓
   - Parsing analysis
   - Running LLM queries (3 simultaneously)
   - Calculating consensus
7. Results displayed:
   - Executive summary
   - Key findings
   - Risk assessment
   - Recommendations
   - Individual LLM perspectives
   - Confidence score per finding
8. Export as JSON/PDF/HTML
9. View analysis history
```

---

## Tech Stack (Phase 2)

### Additions to Phase 1

**File Processing:**
- `pcap`: Parse Wireshark files
- `pydicom` or `dcmjs`: DICOM metadata extraction
- `hl7apy` or custom: HL7 parsing
- `multer`: File upload handling

**Consensus Engine:**
- Custom JavaScript/Python implementation
- No heavy ML framework needed (logic only)

**LLM APIs:**
- Groq: `@groq-ai/groq-sdk`
- Hugging Face: `@huggingface/inference`
- Anthropic Claude: `@anthropic-ai/sdk`

**Database:**
- PostgreSQL (existing from Phase 1)
- JSONB columns for flexible result storage

**Frontend:**
- Dropzone.js for drag-drop upload
- Chart.js for visualization
- PDF export: `jsPDF`, `html2canvas`

---

## GitHub-Based Deployment

### Why GitHub?

```
✅ Free hosting (GitHub Pages for frontend)
✅ Free CI/CD (GitHub Actions)
✅ Free private repo
✅ Version control built-in
✅ Automated testing & deployment
✅ API available from anywhere
✅ Works on any machine with internet
```

### Deployment Strategy

```
Repository Structure:
├── frontend/           → Deployed to GitHub Pages (static)
├── backend/            → Deployed to free platform (Railway/Render/Replit)
├── .github/workflows/  → CI/CD pipelines (free)
├── docker-compose.yml  → Local dev + production
└── docs/               → GH Pages documentation site

GitHub Actions Workflow:
1. Code pushed to main
2. Tests run (automated)
3. Docker image built
4. Container pushed to GHCR
5. Deployment triggered
6. E2E tests run
7. Notification sent
```

### Free Hosting Options

| Option | Cost | Best For | Limitations |
|--------|------|----------|-------------|
| **GitHub Pages** | Free | Frontend static site | No backend |
| **Railway** | Free tier | Node.js backend | 5 projects, 512MB RAM |
| **Render** | Free tier | Node.js backend | Sleeps after 15 min inactivity |
| **Replit** | Free tier | Node.js backend | Community-friendly |
| **Vercel** | Free tier | Next.js frontend | Limited backend support |

**Recommended:** Railway or Render for backend (swap if one fills up)

---

## Cost Analysis

### Running Costs (Monthly)

```
Infrastructure:
- GitHub: FREE (private repo)
- Railway/Render: FREE (within quota)
- PostgreSQL: FREE (Render, Railway, or local)
- Docker images: FREE (GHCR)

LLM API Costs:
- Groq: FREE (25 req/min)
- Hugging Face: FREE (rate limited)
- Claude: $0.08/1M input tokens (optional, for premium consensus)

Total: $0 or minimal
```

### Scaling Strategy

```
Phase 1 (MVP):
- Groq + Hugging Face only
- Cost: $0/month

Phase 1+ (Scaling):
- Add Claude for premium consensus
- Cost: ~$5-20/month depending on usage

If need more LLM capacity:
- Add open-source local models (Ollama)
- Deploy to local GPU (own hardware)
- Cost: $0 + electricity
```

---

## Simplified Tech Stack Summary

### What We're Building

**Phase 1:** Web-based Linux learning game (Docker + React + Node)
**Phase 2:** File analysis platform on top of Phase 1

**Minimal, no extra complexity:**

```
Frontend: React (no change)
Backend: Node.js + Express (no change)
Database: PostgreSQL (no change)
LLMs: Free APIs (Groq, Hugging Face, Claude)
Hosting: GitHub + Railway (free tiers)
File processing: Simple parsers (no heavy ML)
```

**That's it.** No machine learning models, no complex inference, just:
- File upload
- Data extraction
- Parallel LLM queries
- Consensus voting
- Results storage

---

## Implementation Phases (Phase 2)

### Phase 2a: File Upload Infrastructure (Week 1)
1. Add file upload UI component
2. File validation & size checks
3. File parser modules (logs, pcap, hl7, dicom)
4. Database schema for analysis sessions
5. Upload endpoint + authentication

### Phase 2b: Single-LLM Analysis (Week 1-2)
1. Groq API integration for file analysis
2. Context-aware prompts for each file type
3. Results storage in database
4. Results display in UI
5. Export to JSON

### Phase 2c: Multi-LLM Consensus (Week 2)
1. Add Hugging Face API integration
2. Add Claude API integration (optional)
3. Parallel query execution
4. Consensus voting engine
5. Confidence score calculation
6. Update results table with consensus data

### Phase 2d: Polish & Deployment (Week 2-3)
1. Export to PDF/HTML
2. Analysis history/search
3. Performance optimization
4. Security hardening
5. Deployment scripts
6. Documentation
7. Live on GitHub + Railway

---

## Security Considerations

### File Upload Security

```javascript
// Checklist:
✓ File size limits (prevent DOS)
✓ File type validation (magic bytes)
✓ Virus scanning (VirusTotal API)
✓ Sanitize file names
✓ Store in temp directory, auto-delete
✓ User authentication required
✓ Rate limiting on uploads
✓ Audit logging
```

### Data Privacy

```
// Users should know:
✓ Files are processed by 3rd party LLMs
✓ LLM API providers see the data
✓ Consider Groq/HF privacy policies
✓ HIPAA compliance: Maybe not suitable for true PHI
✓ Option: Deploy local Ollama for sensitive data
```

### API Key Security

```
✓ Store in .env, never in code
✓ Use GitHub Secrets for CI/CD
✓ Rotate keys periodically
✓ Rate limit per user
✓ Monitor API usage
```

---

## Simplified Architecture Diagram

```
┌─────────────┐
│   GitHub    │
│  (Frontend) │
└──────┬──────┘
       │
       ↓
┌─────────────────────┐
│  Railway/Render     │
│  (Backend API)      │
└──────┬──────────────┘
       │
       ├─→ PostgreSQL (on Railway)
       │
       ├─→ Groq API (free)
       │
       ├─→ Hugging Face API (free)
       │
       └─→ Claude API (optional, $$$)
```

---

## Quick Start for Phase 2

```bash
# Add to existing project:

# 1. New file upload endpoint
POST /api/analysis/upload

# 2. New analysis service
src/services/fileAnalyzer.ts

# 3. New LLM service (reuse from Phase 1)
src/services/consensusEngine.ts

# 4. New database tables
backend/migrations/add_analysis_tables.sql

# 5. New frontend page
frontend/src/pages/FileAnalysis.tsx

# 6. New UI components
frontend/src/components/FileUpload.tsx
frontend/src/components/AnalysisResults.tsx
```

---

## Expected Outcomes

### By End of Phase 2

Users can:
- ✅ Upload any log file, get AI analysis with consensus
- ✅ Upload Wireshark captures, understand network patterns
- ✅ Upload HL7 messages, see clinical significance
- ✅ Upload DICOM metadata, verify completeness
- ✅ See confidence scores on all findings
- ✅ Export results as JSON/PDF
- ✅ Access from anywhere via GitHub
- ✅ All completely free

### Real-World Use Cases

1. **System Administrator:** Upload application logs, get root cause analysis
2. **Network Engineer:** Upload PCAP files, identify anomalies
3. **Healthcare IT:** Upload HL7 messages, verify data quality
4. **Radiologist:** Upload DICOM metadata, confirm study completeness
5. **Security Analyst:** Upload network captures, detect threats

---

## Success Metrics (Phase 2)

- ✅ File upload working for all types
- ✅ Parsing successful >95% of time
- ✅ Analysis completes <30 seconds for typical files
- ✅ Consensus accuracy >85% on test cases
- ✅ Confidence scores properly calibrated
- ✅ Zero downtime deployment
- ✅ <5 second page load times
- ✅ Mobile-responsive UI
- ✅ Full audit trail of analyses
- ✅ Export functionality working
