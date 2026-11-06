import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ROUTES } from '../../app/routes';
import orgIntelLogo from '../../assets/OrgIntelLogo.png';
import {
  Shield,
  Lock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Search,
  Cpu,
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handlePrimaryAction = () => {
    if (isAuthenticated) {
      navigate(ROUTES.DOCUMENTS);
    } else {
      navigate(ROUTES.REGISTER);
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Header Navigation */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-light)',
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-8)',
        }}
      >
        {/* Brand */}
        <div
          onClick={() => navigate(ROUTES.HOME)}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          aria-label="OrgIntel Home"
          onKeyDown={(e) => {
            if (e.key === 'Enter') navigate(ROUTES.HOME);
          }}
        >
          <img
            src={orgIntelLogo}
            alt="OrgIntel Logo"
            style={{ height: '32px', width: 'auto', display: 'block', objectFit: 'contain' }}
          />
        </div>

        {/* Right CTA Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {isAuthenticated ? (
            <button
              onClick={() => navigate(ROUTES.DOCUMENTS)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
            >
              <span>Go to Workspace</span>
              <ArrowRight size={15} />
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate(ROUTES.LOGIN)}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.85rem' }}
              >
                Sign In
              </button>
              <button
                onClick={() => navigate(ROUTES.REGISTER)}
                className="btn btn-primary"
                style={{ padding: '0.45rem 1rem' }}
              >
                Get Started Free
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. Hero Section */}
      <section
        style={{
          position: 'relative',
          padding: 'var(--space-12) var(--space-8) var(--space-10) var(--space-8)',
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Ambient Top Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '240px',
            background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, rgba(248,250,252,0) 70%)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Eyebrow Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              backgroundColor: 'var(--primary-50)',
              border: '1px solid var(--primary-100)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              color: 'var(--primary-800)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              marginBottom: 'var(--space-6)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <Shield size={14} style={{ color: 'var(--primary-700)' }} />
            <span>Zero Hallucination &bull; Multi-Tenant Isolated</span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: 'clamp(2.2rem, 4.5vw, 3.6rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              maxWidth: '920px',
              margin: '0 auto var(--space-6) auto',
            }}
          >
            Enterprise Document Intelligence Backed by{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, var(--primary-700) 0%, var(--primary-900) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Strict Citation Evidence
            </span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'var(--text-lg)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              maxWidth: '780px',
              margin: '0 auto var(--space-8) auto',
            }}
          >
            Ask mission-critical questions across complex legal agreements, compliance policies, engineering specs, and financial audits. OrgIntel pairs hybrid lexical-vector retrieval with deterministic evidence validation to guarantee that every assertion cites a verified passage.
          </p>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <button
              onClick={handlePrimaryAction}
              className="btn btn-primary"
              style={{
                fontSize: 'var(--text-md)',
                padding: '0.75rem 1.75rem',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 14px rgba(30, 64, 175, 0.25)',
              }}
            >
              <span>{isAuthenticated ? 'Launch Workspace Console' : 'Start Enterprise Free Trial'}</span>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => scrollToSection('architecture')}
              className="btn btn-secondary"
              style={{
                fontSize: 'var(--text-md)',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <Cpu size={16} />
              <span>Explore Technical Architecture</span>
            </button>
          </div>

          {/* Trust Metrics Ribbon */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-4)',
              marginTop: 'var(--space-12)',
              paddingTop: 'var(--space-8)',
              borderTop: '1px solid var(--border-light)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--primary-800)' }}>100%</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Evidence Grounding
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Deterministic abstention on missing facts
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--primary-800)' }}>RRF + HNSW</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hybrid Dual Retrieval
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Reciprocal Rank Fusion on pgvector & GIN
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--primary-800)' }}>Zero Leakage</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tenant Isolation
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Granular RBAC and document permission barriers
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Product Console Mockup */}
      <section style={{ padding: '0 var(--space-8) var(--space-12) var(--space-8)', maxWidth: '1160px', margin: '0 auto', width: '100%' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-medium)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}
        >
          {/* Mock Window Header */}
          <div
            style={{
              backgroundColor: '#0f172a',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #1e293b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: '#94a3b8', marginLeft: '12px', fontFamily: 'var(--font-mono)' }}>
                orgintel-console &mdash; Q3 Regulatory & Governance Verification
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#38bdf8',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: 600,
                }}
              >
                TENANT: ACME_CORP_SECURE
              </span>
            </div>
          </div>

          {/* Mock Console Content */}
          <div style={{ padding: 'var(--space-6)', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-6)', backgroundColor: '#ffffff' }}>
            {/* Left: Chat Question & Answer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* User Question */}
              <div style={{ alignSelf: 'flex-end', backgroundColor: 'var(--primary-800)', color: 'white', padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', maxWidth: '90%' }}>
                What are the core hours and vacation accrual terms specified in our updated Leave Policy?
              </div>

              {/* Assistant Answer */}
              <div style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-light)', padding: '16px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', lineHeight: 1.65 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--primary-800)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>
                  <Sparkles size={14} />
                  <span>OrgIntel Grounded Intelligence Engine</span>
                </div>
                <p style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
                  According to the organizational policies, employees are granted 25 days of paid annual vacation each calendar year{' '}
                  <span style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-800)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                    [1]
                  </span>
                  . Furthermore, remote team members must log core working hours between 10:00 AM and 4:00 PM local time{' '}
                  <span style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-800)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                    [2]
                  </span>
                  .
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '10px', marginTop: '10px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Sources:</span>
                  <span style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--bg-surface-muted)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                    [1] Leave Policy, Page 1
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--bg-surface-muted)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                    [2] Remote Policy, Page 2
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Verified Citation Inspector Mockup */}
            <div style={{ backgroundColor: 'var(--bg-surface-muted)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                  Passage Inspector [1]
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--status-success-text)', backgroundColor: 'var(--status-success-bg)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                  Grounding Verified
                </span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                <strong>Origin:</strong> Leave_Policy_2026.md &bull; Section: Annual Leave &bull; Version 1
              </div>
              <div style={{ fontStyle: 'italic', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', borderLeft: '3px solid var(--primary-700)', paddingLeft: '10px', backgroundColor: '#ffffff', padding: '10px', borderRadius: '4px' }}>
                &ldquo;Employees are granted 25 days of paid annual vacation each year. Sick leave is allocated separately up to 10 days.&rdquo;
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)', padding: '8px', borderRadius: '4px', border: '1px dashed var(--border-medium)' }}>
                <strong>Verification Hash:</strong> HNSW distance = 0.0412 &bull; Deterministic match confirmed
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Enterprise Capabilities Grid */}
      <section id="capabilities" style={{ padding: 'var(--space-12) var(--space-8)', backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--primary-800)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Built for High-Stakes Environments
            </span>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', marginTop: 'var(--space-2)' }}>
              Engineered with Enterprise Safeguards
            </h2>
            <p style={{ fontSize: 'var(--text-md)', color: 'var(--text-muted)', maxWidth: '640px', margin: 'var(--space-2) auto 0 auto' }}>
              Standard generic chatbots hallucinate when facts are absent. OrgIntel provides provable mathematical boundaries.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
            {/* Capability 1 */}
            <div className="card" style={{ padding: 'var(--space-6)', transition: 'transform var(--transition-fast)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-50)', color: 'var(--primary-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
                <Shield size={22} />
              </div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Deterministic Abstention
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                If corporate documents do not contain direct evidence to answer an inquiry, OrgIntel explicitly abstains rather than inventing plausible falsehoods.
              </p>
            </div>

            {/* Capability 2 */}
            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-50)', color: 'var(--primary-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
                <Search size={22} />
              </div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Hybrid RRF Retrieval
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Fuses lexical full-text keyword indexing (PostgreSQL GIN) with dense vector semantic search (pgvector HNSW) using Reciprocal Rank Fusion for optimal recall.
              </p>
            </div>

            {/* Capability 3 */}
            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-50)', color: 'var(--primary-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
                <Lock size={22} />
              </div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Multi-Tenant Isolation & RBAC
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Strict cryptographic workspace boundaries. Restricted documents are hidden from unauthorized members at both the SQL and vector query layers.
              </p>
            </div>

            {/* Capability 4 */}
            {/* <div className="card" style={{ padding: 'var(--space-6)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-50)', color: 'var(--primary-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
                <Zap size={22} />
              </div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Sub-Second Token Streaming
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Real-time Server-Sent Events (SSE) streaming answers word-by-word with live citation badges and deferred feedback triggers until generation completes.
              </p>
            </div> */}

            {/* Capability 5 */}
            {/* <div className="card" style={{ padding: 'var(--space-6)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-50)', color: 'var(--primary-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
                <Layers size={22} />
              </div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Multi-Format Ingestion Engine
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Native extractors for PDF (PDFBox), DOCX, Markdown, and plain text with token-aware chunking and automated embedding calculation.
              </p>
            </div> */}

            {/* Capability 6 */}
            {/* <div className="card" style={{ padding: 'var(--space-6)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-50)', color: 'var(--primary-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
                <BarChart3 size={22} />
              </div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                Conflict Detection & Auditing
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                When multiple corporate documents present contradictory directives, OrgIntel highlights the discrepancy and provides side-by-side passage comparisons.
              </p>
            </div> */}
          </div>
        </div>
      </section>

      {/* 5. Architecture Pipeline Section */}
      

      {/* 6. Security & Governance Deep Dive */}
      {/* <section id="security" style={{ padding: 'var(--space-12) var(--space-8)', backgroundColor: '#0f172a', color: '#ffffff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Enterprise Security
              </span>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginTop: 'var(--space-2)', color: '#ffffff' }}>
                Your Proprietary Knowledge Stays Strictly Yours
              </h2>
              <p style={{ fontSize: 'var(--text-md)', color: '#94a3b8', marginTop: 'var(--space-3)', lineHeight: 1.6 }}>
                OrgIntel was designed from the ground up for strict confidentiality. Data isolation is maintained across every tier &mdash; from disk to vector store to model context.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                  <CheckCircle2 size={18} style={{ color: '#38bdf8', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#ffffff' }}>Zero Model Retraining:</strong> Customer data is never cached or used to fine-tune foundational language models.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                  <CheckCircle2 size={18} style={{ color: '#38bdf8', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#ffffff' }}>Database-Level Authorization:</strong> Documents marked RESTRICTED are filtered out before reaching vector matching.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                  <CheckCircle2 size={18} style={{ color: '#38bdf8', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#ffffff' }}>Complete Audit Trail:</strong> Every document query, permission modification, and user action is logged with structured event metadata.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#1e293b', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid #334155' }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#f8fafc', marginBottom: 'var(--space-4)' }}>
                Compliance & Security Matrix
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #334155', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: '#94a3b8' }}>Multi-Tenancy Model</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>Hard Shared-Schema Tenant Partitioning</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #334155', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: '#94a3b8' }}>Vector Store</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>PostgreSQL pgvector with HNSW</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #334155', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: '#94a3b8' }}>Encryption Standard</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>AES-256 at Rest & TLS 1.3 in Transit</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #334155', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: '#94a3b8' }}>Auth Protocol</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>Stateless Signed JWT with Spring Security</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* 7. Bottom Call-To-Action Banner */}
      <section style={{ padding: 'var(--space-12) var(--space-8)' }}>
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            background: 'linear-gradient(135deg, var(--primary-900) 0%, var(--primary-950) 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-10) var(--space-8)',
            textAlign: 'center',
            color: '#ffffff',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#ffffff', marginBottom: 'var(--space-3)' }}>
            Ready to Experience True Document Intelligence?
          </h2>
          <p style={{ fontSize: 'var(--text-md)', color: '#cbd5e1', maxWidth: '620px', margin: '0 auto var(--space-6) auto', lineHeight: 1.6 }}>
            Empower your leadership, legal, engineering, and compliance teams with instant, verifiable answers grounded in facts.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <button
              onClick={handlePrimaryAction}
              className="btn"
              style={{
                backgroundColor: '#ffffff',
                color: 'var(--primary-900)',
                fontWeight: 700,
                fontSize: 'var(--text-md)',
                padding: '0.75rem 1.75rem',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span>{isAuthenticated ? 'Open Document Workspace' : 'Get Started Now'}</span>
              <ArrowRight size={18} />
            </button>
            {!isAuthenticated && (
              <button
                onClick={() => navigate(ROUTES.LOGIN)}
                className="btn"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  fontSize: 'var(--text-md)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                Sign In to Existing Organization
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer
        style={{
          marginTop: 'auto',
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-light)',
          padding: 'var(--space-8) var(--space-8) var(--space-6) var(--space-8)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <img
                src={orgIntelLogo}
                alt="OrgIntel Logo"
                style={{ height: '26px', width: 'auto', objectFit: 'contain' }}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: '8px' }}>
                Secure Enterprise Document Intelligence Platform
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span>All Systems Operational</span>
              </span>
              <span>&bull;</span>
              <span>Spring AI 2.0.2 Inside</span>
              <span>&bull;</span>
              <span>pgvector HNSW</span>
            </div>
          </div> */}

          <div style={{ paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <div>&copy; 2026 OrgIntel Enterprise. All rights reserved.</div>
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <button onClick={() => navigate(ROUTES.LOGIN)} className="btn-ghost" style={{ fontSize: 'var(--text-xs)' }}>
                Sign In
              </button>
              <button onClick={() => navigate(ROUTES.REGISTER)} className="btn-ghost" style={{ fontSize: 'var(--text-xs)' }}>
                Register
              </button>
              <button onClick={() => navigate(ROUTES.DOCUMENTS)} className="btn-ghost" style={{ fontSize: 'var(--text-xs)' }}>
                Documents
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
