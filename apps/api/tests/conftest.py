from io import BytesIO

import pytest
from openpyxl import Workbook


@pytest.fixture
def xlsx_bytes():
    def build(sheets: dict[str, list[list[object]]]) -> bytes:
        workbook = Workbook()
        first = True
        for name, rows in sheets.items():
            worksheet = workbook.active if first else workbook.create_sheet()
            first = False
            worksheet.title = name
            for row in rows:
                worksheet.append(row)
        output = BytesIO()
        workbook.save(output)
        return output.getvalue()

    return build
