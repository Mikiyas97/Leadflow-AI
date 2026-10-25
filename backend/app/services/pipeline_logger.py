"""LeadFlow AI - Pipeline Terminal Logger.
Outputs high-visibility, structured, real-time telemetry to the server terminal (stdout).
Engineered to be 100% resilient across Windows PowerShell, CMD, and Linux terminals.
"""
import sys
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

# Ensure stdout safely handles UTF-8 on Windows without crashing cp1252
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

logger = logging.getLogger("leadflow.pipeline")

# ANSI Colors
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
MAGENTA = "\033[95m"
BLUE = "\033[94m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"


def tprint(msg: str = ""):
    """Prints message directly to sys.stdout with immediate flush and logs via python logger."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    if msg:
        formatted = f"{DIM}[{timestamp}]{RESET} {msg}"
        encoding = getattr(sys.stdout, "encoding", "utf-8") or "utf-8"
        try:
            print(formatted, flush=True)
        except UnicodeEncodeError:
            safe_text = formatted.encode(encoding, errors="replace").decode(encoding)
            print(safe_text, flush=True)
        logger.info(msg)
    else:
        print("", flush=True)


class PipelineTerminalLogger:
    """Helper for formatted real-time terminal logging during lead search & qualification."""

    @staticmethod
    def log_start(
        run_id: Optional[int],
        campaign_name: Optional[str],
        target_businesses: List[str],
        location: str,
        service_offered: str,
        decision_makers: List[str],
        company_size: Optional[str],
        website_status: str,
        lead_quantity: int,
        min_qualification_score: int
    ):
        biz_str = ", ".join(target_businesses) if target_businesses else "All Businesses"
        dm_str = ", ".join(decision_makers) if decision_makers else "Any (Owner, GM, Executive)"
        size_str = company_size if company_size and company_size != "Any" else "Any (Optional)"

        print("\n" + "=" * 80, flush=True)
        tprint(f"{BOLD}{CYAN}>>> [LEADFLOW PIPELINE] INITIATING SEARCH RUN #{run_id or 'NEW'}{RESET}")
        print("=" * 80, flush=True)
        tprint(f"[*] {BOLD}Campaign:{RESET} {campaign_name or 'Lead Search'}")
        tprint(f"[*] {BOLD}Target Businesses:{RESET} {biz_str}")
        tprint(f"[*] {BOLD}Location:{RESET} {location}")
        tprint(f"[*] {BOLD}Service Offered:{RESET} {service_offered}")
        tprint(f"[*] {BOLD}Target Decision-Makers:{RESET} {dm_str}")
        tprint(f"[*] {BOLD}Company Size:{RESET} {size_str}")
        tprint(f"[*] {BOLD}Website Status Requirement:{RESET} {website_status}")
        tprint(f"[*] {BOLD}Requested Leads:{RESET} {lead_quantity} | {BOLD}Min Score Threshold:{RESET} {min_qualification_score}/100")
        print("-" * 80, flush=True)

    @staticmethod
    def log_discovery_query(query: str, location: str, status_filter: str):
        tprint(f"{BOLD}{BLUE}[1/4] Serper.dev Discovery — Finding potential leads{RESET}")
        tprint(f"      Query: {CYAN}\"{query}\"{RESET} in {location} (Website filter: {status_filter})")

    @staticmethod
    def log_discovery_results(candidates: List[Dict[str, Any]]):
        if not candidates:
            tprint(f"{YELLOW}      [!] Discovery returned 0 candidates. Zero mock data will be fabricated.{RESET}")
            return

        tprint(f"{GREEN}      [+] Discovered {len(candidates)} prospective company candidate(s):{RESET}")
        for i, c in enumerate(candidates[:10], 1):
            name = c.get("company_name", "Unknown")
            web = c.get("website", "no website")
            loc = c.get("location", "")
            tprint(f"          {i}. {BOLD}{name}{RESET} ({web}) {DIM}- {loc}{RESET}")
        if len(candidates) > 10:
            tprint(f"          ... and {len(candidates) - 10} more.")
        print("-" * 80, flush=True)

    @staticmethod
    def log_website_verification(
        index: int,
        total: int,
        company_name: str,
        website: str,
        website_status: str,
        evidence: Optional[str] = None
    ):
        status_color = GREEN if website_status == "HAS_OFFICIAL_WEBSITE" else (
            YELLOW if website_status == "OUTDATED_WEBSITE" else (
                MAGENTA if website_status == "NO_OFFICIAL_WEBSITE_FOUND" else DIM
            )
        )
        tprint(f"{BOLD}[2/4] Firecrawl Verification [{index}/{total}] — Verifying business websites: {BOLD}{company_name}{RESET} ({website})")
        tprint(f"      Status: {status_color}{BOLD}{website_status}{RESET}")
        if evidence:
            tprint(f"      Evidence: {DIM}{evidence}{RESET}")

    @staticmethod
    def log_ai_qualification(
        index: int,
        total: int,
        company_name: str,
        score: int,
        threshold: int,
        status: str,
        reason: Optional[str] = None,
        strengths: Optional[List[str]] = None,
        risks: Optional[List[str]] = None
    ):
        is_qualified = status == "QUALIFIED" and score >= threshold
        status_badge = f"{GREEN}[QUALIFIED]{RESET}" if is_qualified else f"{RED}[DISQUALIFIED (Below threshold {threshold})]{RESET}"

        tprint(f"{BOLD}[3/4] Gemini AI Qualification [{index}/{total}] — Scoring lead relevance for {BOLD}{company_name}{RESET}")
        tprint(f"      Score: {BOLD}{score}/100{RESET} -> {status_badge}")
        if reason:
            tprint(f"      Rationale: {reason}")
        if strengths:
            tprint(f"      Strengths: {GREEN}{', '.join(strengths)}{RESET}")
        if risks:
            tprint(f"      Risks: {YELLOW}{', '.join(risks)}{RESET}")

    @staticmethod
    def log_contacts(
        company_name: str,
        website: str,
        decision_makers: List[str],
        contacts: List[Any]
    ):
        tprint(f"{BOLD}[4/4] Hunter.io Contacts — Finding professional emails for '{website}'{RESET}")
        if decision_makers:
            tprint(f"      Prioritizing roles: {CYAN}{', '.join(decision_makers)}{RESET}")
        if not contacts:
            tprint(f"      {DIM}No direct verified contacts returned by Hunter.io.{RESET}")
            return

        tprint(f"{GREEN}      [+] Identified {len(contacts)} contact(s):{RESET}")
        for c in contacts:
            name = getattr(c, "name", c.get("name") if isinstance(c, dict) else "N/A")
            title = getattr(c, "job_title", c.get("job_title") if isinstance(c, dict) else "N/A") or "Role unlisted"
            email = getattr(c, "email", c.get("email") if isinstance(c, dict) else "N/A") or "no email"
            status = getattr(c, "email_status", c.get("email_status") if isinstance(c, dict) else "unverified")
            tprint(f"          - {BOLD}{name}{RESET} | {title} | {CYAN}{email}{RESET} ({status})")

    @staticmethod
    def log_outreach_draft(company_name: str, recipient: str, subject: str):
        tprint(f"{BOLD}[4/4] OUTREACH | Prepared personalized cold email for {BOLD}{company_name}{RESET}")
        tprint(f"      Recipient: {recipient}")
        tprint(f"      Subject: {BOLD}\"{subject}\"{RESET}")

    @staticmethod
    def log_finish(
        run_id: Optional[int],
        total_evaluated: int,
        qualified_count: int,
        drafts_count: int,
        threshold: int
    ):
        print("-" * 80, flush=True)
        tprint(f"{BOLD}{GREEN}>>> [LEADFLOW PIPELINE] RUN #{run_id or 'DONE'} FINISHED SUCCESSFULLY{RESET}")
        tprint(f"   * Candidates Evaluated: {BOLD}{total_evaluated}{RESET}")
        tprint(f"   * Qualified Leads (Score >= {threshold}): {BOLD}{GREEN}{qualified_count}{RESET}")
        tprint(f"   * Disqualified Leads: {BOLD}{RED}{total_evaluated - qualified_count}{RESET}")
        tprint(f"   * Outreach Drafts Prepared: {BOLD}{CYAN}{drafts_count}{RESET}")
        print("=" * 80 + "\n", flush=True)

    @staticmethod
    def log_error(stage: str, message: str):
        tprint(f"{BOLD}{RED}[!] [PIPELINE ERROR] In {stage}: {message}{RESET}")


pipeline_logger = PipelineTerminalLogger()
