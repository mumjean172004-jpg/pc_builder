# -*- coding: utf-8 -*-
import sys

ch3_path = r"c:\Users\Kanomjean\Downloads\project\KnowledgeBase\07_document\Chapter3_Methodology.md"
mermaid_path = r"c:\Users\Kanomjean\Downloads\project\KnowledgeBase\07_document\drawio_sources\3_compatibility_check_flow.mermaid"

# Read the detailed mermaid flowchart
with open(mermaid_path, "r", encoding="utf-8") as f:
    detailed_mermaid = f.read().strip()

# Read Chapter 3 Methodology
with open(ch3_path, "r", encoding="utf-8") as f:
    ch3_content = f.read()

# Locate the simple mermaid diagram under ##### 3.2.1.2 Flowchart การจัดสเปกคอมพิวเตอร์และการตรวจสอบความเข้ากันได้
# It starts with ```mermaid\nflowchart TD\n    Start([เริ่มต้น]) --> SelectPart
# and ends with ```
import re

pattern = r"```mermaid\s*\nflowchart TD\s*\n\s*Start\(\[เริ่มต้น\]\) --> SelectPart.*?```"

# We replace it with:
replacement = f"```mermaid\n{detailed_mermaid}\n```"

new_ch3, count = re.subn(pattern, replacement, ch3_content, flags=re.DOTALL)

if count > 0:
    with open(ch3_path, "w", encoding="utf-8") as f:
        f.write(new_ch3)
    print("Chapter3_Methodology.md merged with detailed compatibility flowchart successfully!")
else:
    print("Failed to locate simple compatibility flowchart in Chapter3_Methodology.md")
    sys.exit(1)
