"""
SharePlate knowledge base + simple keyword-based retrieval.

This file contains a small set of hand-written documents describing how the
SharePlate application actually works today (based on reading the existing
frontend/backend code), and a beginner-friendly retrieval function that
picks the documents most relevant to a user's question.

No embeddings, no vector database. Just:
  1. Split text into lowercase word "tokens".
  2. Count how many of the question's tokens appear in each document.
  3. Return the top-scoring documents.

If you want to teach the assistant something new about SharePlate, just add
a new dict to KNOWLEDGE_DOCS below.
"""

import re

# ---------------------------------------------------------------------------
# Knowledge documents
#
# Each document has:
#   id    - short unique identifier
#   title - short human-readable title (shown to the user as a "source")
#   text  - the actual knowledge, written in plain English
#
# These describe the REAL, currently-implemented behavior of SharePlate.
# Do not add features here that do not exist in the codebase.
# ---------------------------------------------------------------------------
KNOWLEDGE_DOCS = [
    {
        "id": "overview",
        "title": "SharePlate Overview",
        "text": (
            "SharePlate is a food-rescue web application that connects restaurants with "
            "surplus food to NGOs (nonprofits) who can pick it up and distribute it, "
            "instead of the food going to waste. The goal is sustainability: reducing "
            "food waste and helping people in need. SharePlate has three user roles: "
            "restaurant, ngo, and admin. The app is built with a React (Vite) frontend "
            "and an Express + MySQL backend. The MySQL database is named ecorescue_db."
        ),
    },
    {
        "id": "restaurant-workflow",
        "title": "Restaurant Workflow",
        "text": (
            "A restaurant creates an account and logs in, then is taken to the Restaurant "
            "Dashboard at the /restaurant page. From there, a restaurant can post surplus "
            "food using a form that asks for: a food type/description, an estimated "
            "quantity (number of portions), a pickup deadline (chosen as 1, 2, 4, or 8 "
            "hours from now), and optional special instructions (for example, 'come to "
            "the back door'). Submitting the form creates a new post with status "
            "'Available'. The dashboard also shows a list of 'Your Donations': every post "
            "the restaurant has created, along with its current status."
        ),
    },
    {
        "id": "ngo-workflow",
        "title": "NGO Workflow",
        "text": (
            "An NGO creates an account and logs in, then is taken to the NGO Dashboard at "
            "the /ngo page. The main part of the dashboard is the 'Live Food Feed', which "
            "shows all posts whose status is currently 'Available'. An NGO can press "
            "'Claim Food' on a post, which changes that post's status to 'Claimed' and "
            "records the NGO's user id as claimedByNgoId. Claimed posts (that are not yet "
            "completed) show up in the 'Active Claims' panel on the NGO's dashboard, where "
            "the NGO can press 'Mark Picked Up' once the food has actually been collected. "
            "That button sets the post's status to 'Completed'."
        ),
    },
    {
        "id": "admin-workflow",
        "title": "Admin Role",
        "text": (
            "The 'admin' role exists in the user database schema and the navigation bar "
            "shows an 'Admin Panel' link for admin users, but there is currently no "
            "dedicated Admin Dashboard page implemented in the frontend for that route. "
            "If asked about admin features, say clearly that no admin-specific dashboard "
            "currently exists in the application, rather than describing features that "
            "are not implemented."
        ),
    },
    {
        "id": "post-creation",
        "title": "Post Creation",
        "text": (
            "Restaurants create posts (also called donations) through the 'Post Surplus "
            "Food' form on the Restaurant Dashboard. Each post stores: the restaurant's "
            "name, a food type/description, a quantity (portions), a pickup deadline, "
            "optional instructions, a pickup location (latitude/longitude), and a status. "
            "New posts always start with status 'Available'."
        ),
    },
    {
        "id": "post-status-meanings",
        "title": "Post Status Meanings",
        "text": (
            "The posts table defines five possible status values: 'Available', 'Claimed', "
            "'Picked Up', 'Completed', and 'Expired'. In the currently implemented "
            "frontend, only three of these are actually used in the normal flow: a new "
            "post starts as 'Available' (open for any NGO to claim), becomes 'Claimed' "
            "when an NGO claims it, and becomes 'Completed' when the claiming NGO presses "
            "'Mark Picked Up'. The 'Picked Up' and 'Expired' statuses exist in the database "
            "schema but are not currently set anywhere by the frontend or backend code, so "
            "you should not claim that posts move through a 'Picked Up' step, or that "
            "posts automatically expire."
        ),
    },
    {
        "id": "claiming-pickup-workflow",
        "title": "Food Claiming and Pickup Workflow",
        "text": (
            "The end-to-end flow for a piece of surplus food is: (1) a restaurant posts "
            "it, creating a post with status 'Available'; (2) any logged-in NGO can see it "
            "in the Live Food Feed and claim it, which sets status to 'Claimed' and links "
            "the post to that NGO; (3) the NGO physically picks up the food and then "
            "presses 'Mark Picked Up' in their Active Claims panel, which sets status to "
            "'Completed'. When a post is marked 'Completed', the backend also increases "
            "the claiming NGO's pickupsCompleted count and the donating restaurant's "
            "totalDonations count (by the post's quantity)."
        ),
    },
    {
        "id": "impact-sustainability",
        "title": "Impact and Sustainability",
        "text": (
            "SharePlate tracks basic impact statistics per user: stats_totalDonations "
            "(for restaurants, total quantity donated across completed posts), "
            "stats_reliabilityScore (a score starting at 5.0), and "
            "stats_pickupsCompleted (for NGOs, number of completed pickups). The stated "
            "mission of the app is 'Zero Waste, Maximum Impact': connecting surplus food "
            "to people who need it instead of letting it go to waste, and reducing the "
            "environmental impact of food waste."
        ),
    },
    {
        "id": "architecture",
        "title": "Application Architecture",
        "text": (
            "SharePlate has three main parts: (1) a React + Vite frontend, (2) an "
            "Express + MySQL backend exposing a REST API under http://localhost:5000/api "
            "(including GET/POST /api/posts, PATCH /api/posts/:id/status, and "
            "POST /api/auth/login and /api/auth/register), and (3) this RAG "
            "(retrieval-augmented generation) service, a separate FastAPI application "
            "that powers the in-app chatbot by combining SharePlate knowledge, live "
            "database data, and an external large language model. The RAG service does "
            "not replace or modify the existing backend; it reads data directly from the "
            "same MySQL database and calls the existing backend's data indirectly through "
            "that shared database."
        ),
    },
    {
        "id": "dashboards",
        "title": "Existing Dashboards",
        "text": (
            "There are two role-specific dashboards today: the Restaurant Dashboard "
            "(/restaurant), used for posting surplus food and viewing your own "
            "donations, and the NGO Dashboard (/ngo), used for browsing currently "
            "available food and managing active claims. Both dashboards are protected "
            "routes: a logged-out user is redirected to /login, and a user with the "
            "wrong role is redirected to their own dashboard."
        ),
    },
    {
        "id": "auth-notes",
        "title": "Authentication Notes",
        "text": (
            "SharePlate's current authentication is intentionally simple and is not "
            "production-grade: passwords are stored and checked directly against the "
            "database without hashing, and the logged-in user's profile (uid, name, "
            "email, role, and stats) is stored as plain JSON in the browser's "
            "localStorage under the key 'ecoUser' after login or registration. There is "
            "no session token or JWT. This chatbot does not change or improve that "
            "authentication system; it only reads the uid the frontend already has so it "
            "can look up that user's real record in the database."
        ),
    },
    {
        "id": "chatbot-feature",
        "title": "The SharePlate Assistant Chatbot",
        "text": (
            "The SharePlate Assistant is a chat widget available across the app (a "
            "floating button in the bottom-right corner). It answers questions about how "
            "SharePlate works and about live data such as currently available food, a "
            "user's own donations or claims, using this RAG service. It is grounded with "
            "SharePlate-specific knowledge and live database lookups; it is not a "
            "fine-tuned model."
        ),
    },
]


_STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "to", "of", "in", "on", "at", "for", "with", "about", "as", "by",
    "and", "or", "but", "if", "so", "do", "does", "did", "can", "could",
    "will", "would", "should", "i", "you", "he", "she", "it", "we", "they",
    "my", "your", "his", "her", "its", "our", "their", "this", "that",
    "what", "when", "where", "who", "how", "why", "which",
}

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list:
    """Lowercase and split text into simple word tokens, dropping stopwords."""
    tokens = _TOKEN_RE.findall(text.lower())
    return [t for t in tokens if t not in _STOPWORDS and len(t) > 1]


def _score_document(query_tokens, doc) -> int:
    """Simple keyword overlap score: title matches count double."""
    title_tokens = set(tokenize(doc["title"]))
    text_tokens = set(tokenize(doc["text"]))

    score = 0
    for token in query_tokens:
        if token in title_tokens:
            score += 2
        if token in text_tokens:
            score += 1
    return score


def retrieve_relevant_docs(question: str, top_k: int = 3) -> list:
    """
    Return up to `top_k` knowledge documents most relevant to `question`.

    Falls back to the general SharePlate Overview document if nothing scores
    above zero, so the assistant always has at least some grounding.
    """
    query_tokens = tokenize(question)

    scored = [(doc, _score_document(query_tokens, doc)) for doc in KNOWLEDGE_DOCS]
    scored.sort(key=lambda pair: pair[1], reverse=True)

    relevant = [doc for doc, score in scored if score > 0][:top_k]

    if not relevant:
        overview = next((d for d in KNOWLEDGE_DOCS if d["id"] == "overview"), None)
        if overview:
            relevant = [overview]

    return relevant
