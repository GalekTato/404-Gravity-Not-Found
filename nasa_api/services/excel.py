"""Generate an Excel workbook using inline strings, never executable formulas."""
from io import BytesIO
from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree.ElementTree import Element, SubElement, tostring

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


def export_workbook(features):
    headers = [
        "ID", "Date", "Period", "State code", "State", "Hazard", "Name",
        "Severity", "Radius km", "Evidence", "Observed", "Score",
        "Probability", "Source", "Longitude", "Latitude",
    ]
    fields = [
        "id", "date", "month", "state_clave", "state_name", "type", "name",
        "severity", "radius_km", "evidence", "observed", "score", "probability", "source",
    ]
    rows = [headers]
    for feature in features:
        props = feature["properties"]
        rows.append([props.get(field) for field in fields] + feature["geometry"]["coordinates"][:2])
    sheet = Element("worksheet", xmlns=NS)
    view = SubElement(SubElement(sheet, "sheetViews"), "sheetView", workbookViewId="0")
    SubElement(view, "pane", ySplit="1", topLeftCell="A2", activePane="bottomLeft", state="frozen")
    data = SubElement(sheet, "sheetData")
    for index, values in enumerate(rows, 1):
        row = SubElement(data, "row", r=str(index))
        for column, value in enumerate(values):
            cell = SubElement(row, "c", r=f"{chr(65 + column)}{index}")
            if isinstance(value, bool):
                cell.set("t", "b")
                SubElement(cell, "v").text = "1" if value else "0"
            elif isinstance(value, (float, int)):
                SubElement(cell, "v").text = str(value)
            else:
                cell.set("t", "inlineStr")
                SubElement(SubElement(cell, "is"), "t").text = "" if value is None else str(value)
    SubElement(sheet, "autoFilter", ref=f"A1:P{len(rows)}")
    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        archive.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            '</Types>',
        )
        archive.writestr(
            "_rels/.rels",
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            '</Relationships>',
        )
        archive.writestr(
            "xl/workbook.xml",
            f'<workbook xmlns="{NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="EarthSync" sheetId="1" r:id="rId1"/></sheets></workbook>',
        )
        archive.writestr(
            "xl/_rels/workbook.xml.rels",
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            '</Relationships>',
        )
        archive.writestr("xl/worksheets/sheet1.xml", tostring(sheet, encoding="utf-8", xml_declaration=True))
    return output.getvalue()
