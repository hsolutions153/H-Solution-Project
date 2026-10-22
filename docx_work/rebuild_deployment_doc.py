from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.text.paragraph import Paragraph


SOURCE = Path(r"D:\học tập\tài liệu\redeploy code lên azure.docx")
OUTPUT = Path(r"D:\h-solution-project\redeploy code lên azure h-solution-project.docx")


def remove_all_paragraphs(document: Document) -> None:
    body = document._element.body
    for child in list(body):
        if child.tag.endswith("}sectPr"):
            continue
        body.remove(child)


def add_paragraph(document: Document, text: str, style: str) -> Paragraph:
    paragraph = document.add_paragraph(style=style)
    paragraph.add_run(text)
    return paragraph


def main() -> None:
    document = Document(SOURCE)
    remove_all_paragraphs(document)

    add_paragraph(document, "Azure Deployment Guide - H-Solution Backend FastAPI Docker", "Title")
    add_paragraph(document, "1. Build Docker Image", "Heading 1")
    add_paragraph(document, "docker build -t h-solution-api ./backend", "Normal")
    add_paragraph(document, "2. Tag Image", "Heading 1")
    add_paragraph(document, "docker tag h-solution-api multitaskingcommunity.azurecr.io/h-solution-api:latest", "Normal")
    add_paragraph(document, "3. Push to ACR", "Heading 1")
    add_paragraph(document, "docker push multitaskingcommunity.azurecr.io/h-solution-api:latest", "Normal")
    add_paragraph(document, "4. Update Container App", "Heading 1")
    add_paragraph(
        document,
        "az containerapp update --name h-solution-project --resource-group Multitasking-Community --image multitaskingcommunity.azurecr.io/h-solution-api:latest",
        "Normal",
    )
    add_paragraph(document, "5. Restart (optional)", "Heading 1")
    add_paragraph(
        document,
        "az containerapp revision restart --name h-solution-project --resource-group Multitasking-Community",
        "Normal",
    )

    document.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
