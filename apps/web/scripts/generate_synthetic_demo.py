"""Reproduce the bundled synthetic demo workbook from reviewable static rules."""

from argparse import ArgumentParser
from datetime import datetime, timedelta
from pathlib import Path

from openpyxl import Workbook


HEADERS = (
    "customer_id",
    "full_name",
    "email",
    "phone",
    "region",
    "signup_date",
    "last_contact_at",
    "annual_revenue",
    "account_status",
    "notes",
    "active_flag",
    "service_score",
    "customer_age",
)


def build_workbook() -> Workbook:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Customer Operations"
    sheet.append(HEADERS)

    for index in range(1, 51):
        identifier_number = 25 if index == 26 else index
        signup = datetime(2025, 1, 1) + timedelta(days=index - 1)
        contact = datetime(2025, 4, 1, 9, 30) + timedelta(days=index - 1)
        sheet.append(
            (
                f"SYN-CUST-{identifier_number:03d}",
                f"Synthetic Customer {index:02d}",
                None if index in {7, 19, 33} else f"customer{index:02d}@example.test",
                None if index in {5, 18, 42} else f"synthetic-phone-{index:03d}",
                None
                if index in {12, 37}
                else ("North Lab", "South Lab", "East Lab", "West Lab")[index % 4],
                signup.date(),
                contact,
                50_000 + index * 1_250,
                ("active", "review", "paused")[index % 3],
                None if index in {9, 28} else f"Synthetic operational note {index:02d}",
                ("true" if index % 2 else "false")
                if index <= 40
                else ("TRUE" if index % 2 else "FALSE"),
                "unknown" if index == 50 else 70 + index % 20,
                24 + index % 32,
            )
        )

    workbook.properties.creator = "Data Governance Copilot"
    workbook.properties.title = "Synthetic Customer Operations Sample"
    workbook.properties.description = (
        "Synthetic records for deterministic V0.1 demonstration only"
    )
    workbook.properties.created = datetime(2026, 1, 1)
    workbook.properties.modified = datetime(2026, 1, 1)
    return workbook


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument(
        "output",
        nargs="?",
        type=Path,
        default=Path("public/demo/customer-operations-sample.xlsx"),
    )
    output = parser.parse_args().output
    output.parent.mkdir(parents=True, exist_ok=True)
    build_workbook().save(output)


if __name__ == "__main__":
    main()
