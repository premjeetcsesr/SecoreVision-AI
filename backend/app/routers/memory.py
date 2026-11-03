"""
Memory & Notes Endpoints
Persistent storage for user notes and long-term memory.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from app.services.memory_service import memory_service

router = APIRouter(prefix="/api/jarvis", tags=["Memory & Notes"])


class NoteManagePayload(BaseModel):
    action: Optional[str] = "add"
    note: Optional[str] = None
    text: Optional[str] = None
    id: Optional[Any] = None
    note_id: Optional[Any] = None
    query: Optional[str] = None
    q: Optional[str] = None


class MemoryPayload(BaseModel):
    action: Optional[str] = "set"
    category: Optional[str] = "facts"
    key: Optional[str] = None
    value: Optional[Any] = None


# ─────────────────────────────────────────────────────────────────────────────
# NOTES ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/notes")
async def get_notes(q: Optional[str] = Query(None, description="Optional search query filter")):
    """
    Retrieves all persistent notes, optionally filtered by keyword.
    Preserves exact backward-compatible response shape: {'success': True, 'notes': [...]}
    """
    notes = memory_service.list_notes(query=q)
    return {
        "success": True,
        "notes": notes,
        "count": len(notes)
    }


@router.post("/notes")
async def manage_notes(payload: NoteManagePayload):
    """
    Multi-action endpoint for managing persistent notes.
    Supports add, delete, clear, and search actions.
    Preserves existing API contract for action='clear' and action='add'.
    """
    action = (payload.action or "add").strip().lower()

    # Clear all notes
    if action == "clear":
        memory_service.clear_notes()
        return {
            "success": True,
            "message": "Notes cleared",
            "notes": []
        }

    # Delete note by ID
    if action in ("delete", "remove"):
        target_id = payload.id if payload.id is not None else payload.note_id
        if target_id is None:
            raise HTTPException(status_code=400, detail="Note ID is required for delete action.")
        deleted = memory_service.delete_note(target_id)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Note #{target_id} not found.")
        return {
            "success": True,
            "message": f"Note #{target_id} deleted",
            "notes": memory_service.list_notes()
        }

    # Search notes
    if action == "search":
        search_query = payload.query or payload.q or ""
        results = memory_service.search_notes(search_query)
        return {
            "success": True,
            "notes": results,
            "count": len(results)
        }

    # Default action: Add Note
    note_text = (payload.note or payload.text or "").strip()
    if not note_text:
        raise HTTPException(status_code=400, detail="Note text cannot be empty.")

    try:
        created_note = memory_service.add_note(note_text)
        return {
            "success": True,
            "message": f"Note #{created_note['id']} saved",
            "note": created_note,
            "notes": memory_service.list_notes()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save note: {str(e)}")


@router.delete("/notes/{note_id}")
async def delete_note_endpoint(note_id: int):
    """
    Deletes a specific note by ID.
    Returns 404 if the note does not exist.
    """
    deleted = memory_service.delete_note(note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Note #{note_id} not found.")
    return {
        "success": True,
        "message": f"Note #{note_id} deleted",
        "notes": memory_service.list_notes()
    }


# ─────────────────────────────────────────────────────────────────────────────
# USER MEMORY ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/memory")
async def get_user_memory(
    category: Optional[str] = Query(None, description="Optional category filter (identity, preferences, facts, projects, relationships)"),
    q: Optional[str] = Query(None, description="Optional keyword search query")
):
    """Retrieves long-term user memory and preferences."""
    memory_data = memory_service.get_memory(category=category, query=q)
    return {
        "success": True,
        "memory": memory_data
    }


@router.post("/memory")
async def manage_user_memory(payload: MemoryPayload):
    """Sets, deletes, or clears long-term memory entries."""
    action = (payload.action or "set").strip().lower()

    if action == "clear":
        memory_service.clear_memory(category=payload.category)
        return {
            "success": True,
            "message": f"Memory cleared for category '{payload.category or 'all'}'",
            "memory": memory_service.get_memory()
        }

    if action in ("delete", "remove"):
        if not payload.key:
            raise HTTPException(status_code=400, detail="Key is required for memory deletion.")
        cat = payload.category or "facts"
        deleted = memory_service.delete_memory(cat, payload.key)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Memory key '{payload.key}' not found in category '{cat}'.")
        return {
            "success": True,
            "message": f"Deleted {cat}.{payload.key}",
            "memory": memory_service.get_memory()
        }

    # Action: Set memory
    if not payload.key:
        raise HTTPException(status_code=400, detail="Key cannot be empty when storing memory.")
    if payload.value is None:
        raise HTTPException(status_code=400, detail="Value cannot be None when storing memory.")

    cat = payload.category or "facts"
    memory_data = memory_service.set_memory(category=cat, key=payload.key, value=payload.value)
    return {
        "success": True,
        "message": f"Saved {cat}.{payload.key}",
        "memory": memory_data
    }


@router.delete("/memory/{category}/{key}")
async def delete_memory_key(category: str, key: str):
    """Deletes a specific memory entry by category and key."""
    deleted = memory_service.delete_memory(category, key)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Memory key '{key}' not found in category '{category}'.")
    return {
        "success": True,
        "message": f"Deleted {category}.{key}",
        "memory": memory_service.get_memory()
    }
