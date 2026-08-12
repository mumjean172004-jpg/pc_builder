# -*- coding: utf-8 -*-

ch3_path = r"c:\Users\Kanomjean\Downloads\project\KnowledgeBase\07_document\Chapter3_Methodology.md"
report_path = r"c:\Users\Kanomjean\Downloads\project\KnowledgeBase\07_document\report.md"

with open(ch3_path, "r", encoding="utf-8") as f:
    ch3_content = f.read()

# Extract starting from "# บทที่ 3" to the end of the file
idx = ch3_content.find("# บทที่ 3")
if idx != -1:
    ch3_text = ch3_content[idx:].strip()
else:
    print("Error: # บทที่ 3 not found in Chapter3_Methodology.md")
    exit(1)

with open(report_path, "r", encoding="utf-8") as f:
    report_content = f.read()

# Find `# บทที่ 3` in report.md
start_idx = report_content.find("# บทที่ 3")
if start_idx == -1:
    start_idx = report_content.find("# บทที่ 3 ขั้นตอนการดำเนินงาน")
if start_idx == -1:
    start_idx = report_content.find("# บทที่ 3 ขั้นตอนการดำเนินการ")

# Find `# บทที่ 4` in report.md
end_idx = report_content.find("# บทที่ 4 ผลการดำเนินงานและผลการทดลอง")

if start_idx != -1 and end_idx != -1:
    # We replace from start_idx up to end_idx
    new_report = report_content[:start_idx] + ch3_text + "\n\n---\n\n" + report_content[end_idx:]
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(new_report)
    print("report.md merged successfully and completely!")
else:
    print("Indices not found in report.md:", start_idx, end_idx)
