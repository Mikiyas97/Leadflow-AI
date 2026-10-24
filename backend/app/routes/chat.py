"""LeadFlow AI - Chatbot API Router"""
import logging
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter
from backend.app.services.gemini_service import gemini_service

logger = logging.getLogger("leadflow.chat")

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system_prompt: Optional[str] = None


class ChatResponse(BaseModel):
    role: str = "assistant"
    content: str


@router.post("", response_model=ChatResponse)
async def chat_with_agent(payload: ChatRequest):
    """
    Handles conversational interactions with the LeadFlow AI Agent.
    Uses Gemini API if configured, otherwise returns knowledgeable sales ops responses.
    """
    user_messages = [m for m in payload.messages if m.role == "user"]
    latest_user_text = user_messages[-1].content if user_messages else "Hello"

    system_instruction = (
        "You are LeadFlow AI, a world-class B2B Sales Operations and Prospecting AI Agent. "
        "You help sales professionals find target companies, qualify leads based on ICP criteria, "
        "analyze company websites, find decision-maker emails via Hunter.io, and craft high-converting "
        "personalized outreach emails. Keep your answers concise, practical, well-formatted, and helpful."
    )

    if gemini_service.is_configured():
        try:
            from google.genai import types
            contents = []
            for msg in payload.messages[-8:]:
                contents.append(f"{msg.role.upper()}: {msg.content}")
            full_prompt = f"{system_instruction}\n\n" + "\n\n".join(contents) + "\n\nASSISTANT:"

            response = gemini_service.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                )
            )
            return ChatResponse(role="assistant", content=response.text.strip())
        except Exception as e:
            logger.error(f"Gemini chat error: {e}")

    # Fallback intelligent conversational response
    lower = latest_user_text.lower()
    if any(k in lower for k in ["find", "search", "discover", "lead", "prospect"]):
        reply = (
            "🎯 **Lead Discovery Strategy**\n\n"
            "I can help you identify high-fit B2B companies based on your ideal customer profile (ICP). "
            "To get started, tell me:\n"
            "- **Target Industry:** (e.g., B2B SaaS, FinTech, DevTools, HealthTech)\n"
            "- **Company Size:** (e.g., 10-50, 50-200 employees)\n"
            "- **Geography:** (e.g., US, Europe, Remote)\n"
            "- **Key Pain Point / Criteria:** (e.g., technical teams looking to streamline sales workflows)\n\n"
            "Once defined, I can crawl public web profiles with Firecrawl, verify contacts with Hunter.io, and score lead suitability."
        )
    elif any(k in lower for k in ["email", "outreach", "draft", "write", "template"]):
        reply = (
            "✉️ **Personalized Outreach Email Drafter**\n\n"
            "Here is a proven consultative outreach framework tailored to tech decision-makers:\n\n"
            "**Subject:** Quick question regarding {{company_name}}'s sales ops workflow\n\n"
            "Hi {{contact_name}},\n\n"
            "I noticed {{company_name}}'s rapid growth and recent focus on scaling developer tooling.\n\n"
            "Many sales teams spend 10+ hours each week manually researching prospects and checking emails. "
            "We built LeadFlow AI to automate company qualification and draft personalized outreach while keeping your team in 100% control of every send.\n\n"
            "Would you be open to a 10-minute chat this Thursday to see how similar teams are saving 15+ hours weekly?\n\n"
            "Best,\n[Your Name]"
        )
    elif any(k in lower for k in ["firecrawl", "scrape", "crawl", "hunter", "api"]):
        reply = (
            "🔥 **Integrations & Pipeline**\n\n"
            "- **Firecrawl API:** Scrapes readable markdown from target company landing pages and extracts core value propositions.\n"
            "- **Hunter.io API:** Locates verified executive emails with deliverability confidence scores.\n"
            "- **Google Gemini:** Analyzes extracted evidence against your criteria to generate an explainable 0–100 fit score.\n\n"
            "All actions require human review before dispatching cold emails."
        )
    else:
        reply = (
            f"Hello! I am **LeadFlow AI**, your autonomous B2B sales operations assistant.\n\n"
            "I can assist you with:\n"
            "1. **Discovering Leads:** Finding prospective companies matching your criteria.\n"
            "2. **Company Research:** Extracting insights from company websites.\n"
            "3. **Lead Qualification:** Scoring prospects (0–100) based on commercial fit.\n"
            "4. **Outreach Drafting:** Writing personalized 1-on-1 emails for human review.\n\n"
            "What would you like to explore today?"
        )

    return ChatResponse(role="assistant", content=reply)
