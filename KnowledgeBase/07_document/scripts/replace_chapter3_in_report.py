# -*- coding: utf-8 -*-

ch3_path = r"c:\Users\Kanomjean\Downloads\project\KnowledgeBase\07_document\Chapter3_Methodology.md"
report_path = r"c:\Users\Kanomjean\Downloads\project\KnowledgeBase\07_document\report.md"

with open(ch3_path, "r", encoding="utf-8") as f:
    ch3_content = f.read()

# Chapter 3 content starts below the front matter "---" at the top of Chapter3_Methodology.md
parts = ch3_content.split("---")
# We want the content starting from "# บทที่ 3"
ch3_text = ""
for part in parts:
    if "# บทที่ 3" in part:
        ch3_text = part.strip()
        break

if not ch3_text:
    # Fallback to taking everything from the first "# บทที่ 3"
    idx = ch3_content.find("# บทที่ 3")
    if idx != -1:
        ch3_text = ch3_content[idx:].strip()

with open(report_path, "r", encoding="utf-8") as f:
    report_content = f.read()

# We want to replace everything from "# บทที่ 3 ขั้นตอนการดำเนินการ" up to "---" right before "# บทที่ 4"
# Or let's match from "# บทที่ 3 ขั้นตอนการดำเนินการ" to "# บทที่ 4 ผลการดำเนินงานและผลการทดลอง"
start_idx = report_content.find("# บทที่ 3 ขั้นตอนการดำเนินการ")
if start_idx == -1:
    start_idx = report_content.find("# บทที่ 3 ขั้นตอนการดำเนินงาน")
if start_idx == -1:
    start_idx = report_content.find("# บทที่ 3")

end_idx = report_content.find("# บทที่ 4 ผลการดำเนินงานและผลการทดลอง")

if start_idx != -1 and end_idx != -1:
    new_report = report_content[:start_idx] + ch3_text + "\n\n---\n\n" + report_content[end_idx:]
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(new_report)
    print("report.md updated with restructured Chapter 3 successfully!")
else:
    print("Indices not found:", start_idx, end_idx)
