"""Export router — download project as Markdown file."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from urllib.parse import quote, unquote

from backend.config import get_config
from backend.services.project_service import get_project
from backend.services.markdown_parser import serialize_to_markdown

router = APIRouter()


@router.get("/api/projects/{project_id}/export")
async def export_project(project_id: str):
    project_name = unquote(project_id)
    config = get_config()
    try:
        project_data = get_project(config.storage.prompt_dir, project_name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Project not found")
    md_content = serialize_to_markdown(project_data)
    filename = quote(project_data["name"]) + ".md"
    return Response(
        content=md_content,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
