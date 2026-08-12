# 🗂️ Knowledge Base Index

Welcome to the Obsidian Knowledge Base for the **PC Builder Pro / Second-hand Marketplace** project. This vault contains developer-friendly, token-efficient notes detailing every aspect of the project's structure, requirements, architecture, and code rules.

---

## 🗺️ Navigation Map

### 🤖 AI Agent Entry Point
* [[07_document/AI_Agent_Entry]] - **Must Read First!** Key context, folders map, and database translation details for AI models.

### 📐 Project Setup & Structure
* [[01_planning/Project_Structure]] - Detailed breakdown of directories, files, and project environments.
* [[01_planning/Project_Plan]] - High-level project checklist, feature list, and development roadmap.

### 💾 Data & Database
* [[07_document/Database_Schema]] - SQLite tables, field definitions, active indexes, and relationships.

### 🌐 Backend API Documentation
* [[07_document/API_Documentation]] - Active endpoints list, request/response formats, security middleware.

### ⚙️ Core Logic Guides
* [[05_pc_builder/PC_Builder_Compatibility]] - Detailed rules governing hardware compatibility checks.
* [[05_pc_builder/Marketplace_Listing_Checks]] - Anti-fraud listing check logic, pricing floors, and serial matches.

### 🎨 Design System
* [[08_design_system/UI_UX_Guidelines]] - Frontend UI/UX conventions (icons, colors, form components, verification steps), plus a feature-completion log and two silent-bug classes to watch for (§8-9). **Read before redesigning any page** — keeps different AI agent sessions visually consistent.

### ✅ Testing & QA
* [[06_testing/manual_qa_checklist]] - Prioritized (P0/P1/P2) manual QA checklist, including areas automated tests deliberately don't cover (the order status state machine). Run through P0 before any demo/presentation.
* Backend unit tests: `03_backend/__tests__/` (Jest, run `npm test` from `03_backend/`) — compatibility engine, anti-fraud scoring, auth.

### 📝 เล่มรายงานโครงงาน (Project Report Documents)
* [[07_document/ProjectReport_Template]] - **โครงสร้างและรูปแบบเล่มรายงานโครงการ (Project Report Layout Template)**
* [[07_document/Chapter1_Introduction]] - บทที่ 1 บทนำ
* [[07_document/Chapter2_LiteratureReview]] - บทที่ 2 แนวคิด ทฤษฎี และงานวิจัยที่เกี่ยวข้อง
* [[07_document/Chapter3_Methodology]] - บทที่ 3 ขั้นตอนการดำเนินงาน
* [[07_document/Chapter4_Results]] - บทที่ 4 ผลการพัฒนาระบบและการทดสอบ
* [[07_document/Chapter5_Conclusion]] - บทที่ 5 สรุปผล ปัญหา อุปสรรค และข้อเสนอแนะ

### 📊 ไดอะแกรมและผังการทำงาน (Flowcharts & Diagrams)
* [[flowcharts]] - ภาพผังการทำงานทั้งหมด (System Overview, Auth, Anti-Fraud, Compatibility, AutoBuilder, C2C Orders, Admin)
* [[project_overview_and_flowcharts.pdf]] - เอกสารสรุปภาพรวมและ Flowcharts ฉบับรวมสมบูรณ์ (PDF)

---

## 📝 Rules for Future Changes
Whenever new features, changes, bugs, or architectural updates are introduced to this project, follow these documentation practices:
1. **Update `Project_Structure.md`** if files are created, renamed, or deleted.
2. **Update `Database_Schema.md`** if schemas change or new tables are seeded.
3. **Update `API_Documentation.md`** if endpoints are modified, added, or removed.
4. **Update `AI_Agent_Entry.md`** if there are core modifications to rules, compilers, database adapters, or build logic.
5. **Update `08_design_system/UI_UX_Guidelines.md`** (including its per-page status table) whenever a page is redesigned, or a new shared component/pattern is added to `css/style.css`.
