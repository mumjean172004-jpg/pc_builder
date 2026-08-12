# ⚙️ PC Builder Compatibility Rules

This note details the mathematical and string-matching logic checking hardware compatibility.

* **Source File**: `03_backend/services/compatibilityService.js`
* **Trigger Endpoint**: `POST /api/builds/compatibility`

---

## 📐 Compatibility Rules Details

### 1. CPU & Motherboard Socket
* **Field Matched**: `cpu.specs.socket` == `motherboard.specs.socket`
* **Failure (Error)**: *"CPU socket (LGA1700) does not match motherboard socket (AM4)."*
* **Chipset Warning**: Checks if the motherboard chipset is mapped to the CPU socket:
  - `LGA1700`: B660, B760, Z690, Z790, H610, H670
  - `AM4`: A320, B350, B450, B550, X370, X470, X570, A520
  - `AM5`: A620, B650, B650E, X670, X670E
  - **Warning**: *"Chipset B660 may not fully support Core i9-13900K."* if motherboard chipset is missing from socket compatibility maps.

### 2. RAM Type & Motherboard Formats
* **Field Matched**: `ram.specs.type` == `motherboard.specs.ram_type` (e.g. DDR4 vs DDR5)
* **Failure (Error)**: *"RAM type (DDR5) does not match motherboard supported type (DDR4). Use DDR4 RAM."*
* **Capacity Constraint (Warning)**: Total RAM capacity (`ram.specs.capacity_gb * quantity`) > `motherboard.specs.max_ram_gb`.
* **Modules Slot Constraint (Warning)**: Total modules (`ram.specs.modules * quantity`) > `motherboard.specs.ram_slots`.

### 3. GPU Length vs Case
* **Field Matched**: `gpu.specs.length_mm` <= `case.specs.max_gpu_length_mm`
* **Failure (Error)**: *"GPU "RTX 4090" (336mm) is too long for case "Meshify C" (max 315mm)."*
* **Tight Margin Warning**: Triggers warnings if the GPU length is within 90% of the case limit (`gpu.specs.length_mm` > `case.specs.max_gpu_length_mm * 0.9`).

### 4. CPU Cooler Height vs Case
* **Field Matched**: `cooler.specs.height_mm` <= `case.specs.max_cooler_height_mm` (only applies to air coolers).
* **Failure (Error)**: *"CPU cooler "Noctua NH-D15" (165mm) is too tall for case "MasterBox Q300L" (max 157mm)."*

### 5. Liquid Cooler (AIO) Radiator Size Support
* **Field Matched**: `cooler.specs.radiator_mm` exists inside `case.specs.radiator_support` array.
* **Format**: `radiator_support` in cases is stored as a string separated by slash `/` (e.g., `"240/360mm"`).
* **Failure (Error)**: *"Case "Meshify C" does not support 280mm radiator. Supported: 240/360mm."*

### 6. Motherboard Form Factor vs Case Support
* **Field Matched**: Motherboard form factor supported by Case form factor.
* **Compatibility Mapping**:
  - `ATX` Case supports: `['ATX', 'mATX', 'ITX']`
  - `mATX` Case supports: `['mATX', 'ITX']`
  - `ITX` Case supports: `['ITX']`
* **Failure (Error)**: *"Motherboard (ATX) not supported by case "MasterBox Q300L" (mATX)."*

### 7. Power Supply (PSU) Capacity
* **Calculation**:
  - `Estimated TDP = cpu.specs.tdp + SUM(gpu.specs.tdp) + 100W` (for motherboard/storage/fans).
  - `Recommended Safety PSU Wattage = Estimated TDP * 1.25` (provides 25% headroom — confirmed in `compatibilityService.js` and covered by unit test; do not assume 1.2, an earlier version of this note had the wrong multiplier).
* **Critical Draw Failure (Error)**: PSU `wattage` < Estimated TDP.
  - *"PSU wattage (550W) is below estimated system draw (580W)."*
* **Safety Warning**: PSU `wattage` < Recommended Safety PSU Wattage.
  - *"PSU (650W) below recommended 700W for 25% headroom."*
