"""Centralised error handling for FastAPI.

Provides a flat list of validation error messages and passes through HTTPException details.
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError


def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return a simple list of error messages for Pydantic validation failures.
    FastAPI normally returns a list of dicts; the UI expects plain strings.
    """
    errors = [e.get("msg", "Invalid input") for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": errors})


def http_exception_handler(request: Request, exc: HTTPException):
    """Pass through HTTPException details unchanged (still wrapped in ``detail``)."""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

