from backend.services.markdown_parser import parse_markdown_file, serialize_to_markdown

SAMPLE_MD = """---
id: proj-1
name: Test Project
created: 2026-03-16T12:00:00
updated: 2026-03-16T12:00:00
---

## [prompt-1] First Prompt
<!-- tags: tag1, tag2 -->
<!-- order: 1 -->

Hello world prompt content.

## [prompt-2] Second Prompt
<!-- tags: tag3 -->
<!-- order: 2 -->

Another prompt here.
"""

def test_parse_extracts_project_metadata():
    project = parse_markdown_file(SAMPLE_MD, "proj-1.md")
    assert project["id"] == "proj-1"
    assert project["name"] == "Test Project"

def test_parse_extracts_prompts():
    project = parse_markdown_file(SAMPLE_MD, "proj-1.md")
    assert len(project["prompts"]) == 2
    p1 = project["prompts"][0]
    assert p1["id"] == "prompt-1"
    assert p1["title"] == "First Prompt"
    assert p1["tags"] == ["tag1", "tag2"]
    assert p1["order"] == 1
    assert "Hello world prompt content." in p1["content"]

def test_serialize_roundtrip():
    project = parse_markdown_file(SAMPLE_MD, "proj-1.md")
    output = serialize_to_markdown(project)
    reparsed = parse_markdown_file(output, "proj-1.md")
    assert reparsed["name"] == project["name"]
    assert len(reparsed["prompts"]) == len(project["prompts"])
    assert reparsed["prompts"][0]["title"] == project["prompts"][0]["title"]
    assert reparsed["prompts"][0]["content"].strip() == project["prompts"][0]["content"].strip()

def test_parse_empty_file():
    md = "---\nid: empty\nname: Empty\ncreated: 2026-03-16T12:00:00\nupdated: 2026-03-16T12:00:00\n---\n"
    project = parse_markdown_file(md, "empty.md")
    assert project["name"] == "Empty"
    assert len(project["prompts"]) == 0
