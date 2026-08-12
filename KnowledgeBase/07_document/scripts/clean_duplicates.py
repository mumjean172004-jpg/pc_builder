# -*- coding: utf-8 -*-

files = [
    r"c:\Users\Kanomjean\Downloads\project\KnowledgeBase\07_document\Chapter3_Methodology.md",
    r"c:\Users\Kanomjean\Downloads\project\KnowledgeBase\07_document\report.md"
]

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Clean duplicates
    content = content.replace(
        "**ภาพที่ 3.2** Flowchart ขั้นตอนการเข้าสู่ระบบและการคัดกรองบทบาทผู้ใช้งาน\n\n**ภาพที่ 3.2** เป็นการดำเนินงานขั้นตอน",
        "**ภาพที่ 3.2** เป็นการดำเนินงานขั้นตอน"
    )
    content = content.replace(
        "**ภาพที่ 3.2** Flowchart ขั้นตอนการเข้าสู่ระบบและการคัดกรองบทบาทผู้ใช้งาน\r\n\r\n**ภาพที่ 3.2** เป็นการดำเนินงานขั้นตอน",
        "**ภาพที่ 3.2** เป็นการดำเนินงานขั้นตอน"
    )

    content = content.replace(
        "**ภาพที่ 3.3** Flowchart ขั้นตอนตรรกะประเมินความเข้ากันได้อุปกรณ์ฮาร์ดแวร์\n\n**ภาพที่ 3.3** เป็นการดำเนินงานขั้นตอน",
        "**ภาพที่ 3.3** เป็นการดำเนินงานขั้นตอน"
    )
    content = content.replace(
        "**ภาพที่ 3.3** Flowchart ขั้นตอนตรรกะประเมินความเข้ากันได้อุปกรณ์ฮาร์ดแวร์\r\n\r\n**ภาพที่ 3.3** เป็นการดำเนินงานขั้นตอน",
        "**ภาพที่ 3.3** เป็นการดำเนินงานขั้นตอน"
    )

    content = content.replace(
        "**ภาพที่ 3.4** Flowchart ระบบคัดกรองทุจริตและสกัดกั้นโพสต์ขายผิดปกติ\n\n**ภาพที่ 3.4** เป็นการดำเนินงานขั้นตอน",
        "**ภาพที่ 3.4** เป็นการดำเนินงานขั้นตอน"
    )
    content = content.replace(
        "**ภาพที่ 3.4** Flowchart ระบบคัดกรองทุจริตและสกัดกั้นโพสต์ขายผิดปกติ\r\n\r\n**ภาพที่ 3.4** เป็นการดำเนินงานขั้นตอน",
        "**ภาพที่ 3.4** เป็นการดำเนินงานขั้นตอน"
    )

    content = content.replace(
        "**ภาพที่ 3.5** Flowchart ขั้นตอนควบคุมคิวออเดอร์และตรรกะ Rollback คืนสต็อก\n\n**ภาพที่ 3.5** เป็นการดำเนินงานขั้นตอน",
        "**ภาพที่ 3.5** เป็นการดำเนินงานขั้นตอน"
    )
    content = content.replace(
        "**ภาพที่ 3.5** Flowchart ขั้นตอนควบคุมคิวออเดอร์และตรรกะ Rollback คืนสต็อก\r\n\r\n**ภาพที่ 3.5** เป็นการดำเนินงานขั้นตอน",
        "**ภาพที่ 3.5** เป็นการดำเนินงานขั้นตอน"
    )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Cleaned duplicates in: {file_path}")
