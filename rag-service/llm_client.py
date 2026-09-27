"""
Generic OpenAI-compatible LLM client for the SharePlate RAG service.

Works with ANY provider that implements the OpenAI-style
`POST {base_url}/chat/completions` endpoint (OpenAI, xAI/Grok, and others).
Nothing here is hard-coded to a specific provider or model - everything
comes from environment variables:

    LLM_BASE_URL   e.g. https://api.x.ai/v1
    LLM_API_KEY    a secret API key for that provider
    LLM_CHAT_MODEL e.g. a model name currently available on your account

This module intentionally does NOT use the OpenAI Python SDK; it uses plain
`httpx` calls so it stays provider-agnostic.
"""

import os
import httpx


class LLMError(Exception):
    """
    Raised for any problem talking to the LLM provider.

    `user_message` is safe to show to the end user (no secrets).
    `status_code` is the HTTP status FastAPI should respond with.
    """

    def __init__(self, user_message: str, status_code: int = 502):
        super().__init__(user_message)
        self.user_message = user_message
        self.status_code = status_code


def _provider_label(base_url: str) -> str:
    if "x.ai" in base_url:
        return "xAI"
    if "openai.com" in base_url:
        return "OpenAI"
    return "Custom OpenAI-compatible provider"


def _sanitize_provider_error(response: httpx.Response) -> str:
    """
    Pull a short, human-readable error message out of a provider's error
    response, without ever including headers or secrets.
    """
    try:
        data = response.json()
    except ValueError:
        text = (response.text or "").strip()
        return text[:300] if text else "(no error body returned)"

    message = None
    if isinstance(data, dict):
        error_field = data.get("error")
        if isinstance(error_field, dict):
            message = error_field.get("message")
        elif isinstance(error_field, str):
            message = error_field
        if not message:
            message = data.get("message")

    if not message:
        message = str(data)

    return str(message)[:300]


def call_llm(messages: list, temperature: float = 0.2) -> str:
    """
    Call the configured OpenAI-compatible chat completions endpoint.

    `messages` is a list of {"role": ..., "content": ...} dicts, following
    the standard OpenAI chat message format.

    Returns the assistant's reply text, or raises LLMError with a safe,
    specific message for the API layer to return to the frontend.
    """
    base_url = (os.getenv("LLM_BASE_URL") or "").strip().rstrip("/")
    api_key = (os.getenv("LLM_API_KEY") or "").strip()
    model = (os.getenv("LLM_CHAT_MODEL") or "").strip()

    # --- Configuration checks (do this before making any network call) ---
    if not api_key or api_key.upper() in ("YOUR_XAI_API_KEY", "YOUR_API_KEY"):
        raise LLMError(
            "LLM_API_KEY is not configured. Add a valid API key to rag-service/.env.",
            500,
        )
    if not base_url:
        raise LLMError(
            "LLM_BASE_URL is not configured. Add it to rag-service/.env.",
            500,
        )
    if not model:
        raise LLMError(
            "LLM_CHAT_MODEL is not configured. Add it to rag-service/.env.",
            500,
        )

    url = f"{base_url}/chat/completions"
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=30.0)
    except httpx.RequestError as exc:
        print(
            "[RAG] Network error calling LLM provider.\n"
            f"  Provider: {_provider_label(base_url)}\n"
            f"  Base URL: {base_url}\n"
            f"  Model: {model}\n"
            f"  Error: {type(exc).__name__}: {exc}"
        )
        raise LLMError(
            "Could not reach the LLM provider. Check LLM_BASE_URL and your network connection.",
            502,
        )

    status = response.status_code

    if status == 200:
        try:
            data = response.json()
        except ValueError:
            print(
                "[RAG] LLM provider returned invalid JSON.\n"
                f"  Provider: {_provider_label(base_url)}\n"
                f"  Base URL: {base_url}\n"
                f"  Model: {model}\n"
                f"  HTTP status: {status}"
            )
            raise LLMError("The LLM provider returned an invalid response.", 502)

        choices = data.get("choices") if isinstance(data, dict) else None
        if not choices or not isinstance(choices, list):
            print(
                "[RAG] LLM response is missing 'choices'.\n"
                f"  Provider: {_provider_label(base_url)}\n"
                f"  Base URL: {base_url}\n"
                f"  Model: {model}"
            )
            raise LLMError(
                "The LLM provider returned an unexpected response format (missing choices).",
                502,
            )

        message_obj = choices[0].get("message") if isinstance(choices[0], dict) else None
        content = message_obj.get("content") if isinstance(message_obj, dict) else None

        if not content:
            print(
                "[RAG] LLM response is missing message content.\n"
                f"  Provider: {_provider_label(base_url)}\n"
                f"  Base URL: {base_url}\n"
                f"  Model: {model}"
            )
            raise LLMError(
                "The LLM provider returned an unexpected response format (missing content).",
                502,
            )

        return content

    # --- Non-200 responses: print a useful, non-secret diagnostic ---
    sanitized = _sanitize_provider_error(response)
    print(
        f"Provider: {_provider_label(base_url)}\n"
        f"Base URL: {base_url}\n"
        f"Model: {model}\n"
        f"HTTP status: {status}\n"
        f"Error: {sanitized}"
    )

    if status == 401:
        raise LLMError(
            "LLM authentication failed. Check LLM_API_KEY and provider permissions.",
            401,
        )
    if status == 403:
        raise LLMError(
            "LLM access is forbidden. Check API key permissions or account access.",
            403,
        )
    if status == 404:
        raise LLMError(
            "LLM model or endpoint was not found. Check LLM_BASE_URL and LLM_CHAT_MODEL.",
            404,
        )
    if status == 429:
        raise LLMError("LLM rate limit reached.", 429)
    if status >= 500:
        raise LLMError(
            f"The LLM provider returned a server error (HTTP {status}). Try again later.",
            502,
        )

    # Other 4xx errors
    raise LLMError(
        f"The LLM provider rejected the request (HTTP {status}): {sanitized}",
        status,
    )
