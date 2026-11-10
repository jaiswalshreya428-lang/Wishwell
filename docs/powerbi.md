# WishWell Power BI Analytics & Reporting Guide

> **Enterprise Business Intelligence & Viva Examination Reference**  
> Complete technical guide for connecting Microsoft Power BI Desktop to Azure SQL Database, configuring the data model, and building executive dashboards.

---

## 1. Executive Summary & Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                     Azure SQL Database (sqldb-wishwell)                           |
|                                                                                                   |
|   +-------------------------------------------------------------------------------------------+   |
|   | Analytical Views (dbo Schema)                                                             |   |
|   | • vw_wishes_by_category_month  - Monthly demand volume vs fulfilled wishes by category   |   |
|   | • vw_avg_delivery_time        - Turnaround lead time in hours from pledge to delivery     |   |
|   | • vw_institutions_by_status   - Children's home onboarding verification funnel            |   |
|   | • vw_stale_claim_rate         - Expired pledge ratio (platform fulfillment velocity)      |   |
|   | • vw_top_categories           - Demand ranking and category fulfillment efficiency        |   |
|   +---------------------------------------------+---------------------------------------------+   |
+-------------------------------------------------|-------------------------------------------------+
                                                  | Port 1433 (Encrypted TLS 1.2+)
                                                  | User: powerbi_reader (SELECT only)
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                  Microsoft Power BI Desktop / Service                             |
|                                                                                                   |
|   +---------------------------------------+   +-----------------------------------------------+   |
|   | Interactive Filter Slicers            |   | Visual Analytics Dashboard                    |   |
|   | • Category Filter (category_name)     |   | [Visual 1] Wishes Fulfilled by Category/Month  |   |
|   | • Time Range Slicer (month_year)      |   | [Visual 2] Avg Delivery Time (KPI + Lead Time)|   |
|   +---------------------------------------+   | [Visual 3] Institutions by Status (Donut)     |   |
|                                               | [Visual 4] Stale-Claim Rate (Radial Gauge)    |   |
|                                               | [Visual 5] Category Performance Matrix        |   |
|                                               +-----------------------------------------------+   |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Security & Least-Privilege Data Access

To prevent accidental modification of transactional data, reporting is isolated to a dedicated **read-only database user**:
* **Database User**: `powerbi_reader`
* **Default Password**: `PowerBI_SecureReader2026!` *(or retrieved from Azure Key Vault secret `POWERBI-PASSWORD`)*
* **Permission Model**:
  - `GRANT SELECT` on analytical views (`vw_*`), lookup tables (`categories`, `institutions`), and transaction logs.
  - `DENY INSERT, UPDATE, DELETE` across the entire database.

---

## 3. Step-by-Step Connection Instructions (Power BI Desktop)

Follow these exact steps to connect Power BI Desktop to your Azure SQL Database:

### Step 1: Whitelist Your Workstation IP in Azure SQL Firewall
Power BI Desktop requires direct TCP access to port 1433:
1. Open [Azure Portal](https://portal.azure.com) and navigate to **SQL servers** $\rightarrow$ your WishWell SQL Server.
2. In the left navigation, select **Networking** $\rightarrow$ **Firewall rules**.
3. Click **Add your client IPv4 address**, then click **Save**.
4. *(Alternatively via Azure CLI)*:
   ```bash
   MY_IP=$(curl -s https://api.ipify.org)
   az sql server firewall-rule create \
     --resource-group rg-wishwell-prod \
     --server <YOUR_SQL_SERVER_NAME> \
     --name "PowerBiDesktopClient" \
     --start-ip-address "$MY_IP" \
     --end-ip-address "$MY_IP"
   ```

---

### Step 2: Open Connection Dialog in Power BI Desktop
1. Launch **Power BI Desktop**.
2. On the **Home** ribbon, click **Get Data** $\rightarrow$ select **Azure** $\rightarrow$ **Azure SQL database** $\rightarrow$ click **Connect**.

---

### Step 3: Enter Server & Database Credentials
1. In the **SQL Server database** modal, configure:
   * **Server**: `<your-server-name>.database.windows.net` *(e.g. `wishwell-sql-prod.database.windows.net` or `localhost,1433` for local Docker)*
   * **Database**: `sqldb-wishwell` *(or `wishwell` for local Docker)*
   * **Data Connectivity mode**:
     * **Import (Recommended for viva demo)**: Loads data into Power BI's in-memory VertiPaq engine. Delivers lightning-fast slicer interactions and enables rich DAX calculations even if Azure SQL Serverless enters auto-pause.
     * **DirectQuery**: Sends live SQL queries to Azure SQL on every slicer click. Best for real-time monitoring.
2. Click **OK**.

---

### Step 4: Authenticate Using the Read-Only SQL User
1. In the authentication window, select the **Database** tab on the left *(do NOT select Windows or Microsoft Account)*.
2. Enter the credentials:
   * **User name**: `powerbi_reader`
   * **Password**: `PowerBI_SecureReader2026!`
   * **Select which level to apply these settings to**: `https://<your-server>.database.windows.net,1433`
3. Click **Connect**.
4. If prompted with an **Encryption Support** warning, click **OK** (Azure SQL requires encrypted TLS 1.2+).

---

### Step 5: Select Analytics Views in the Navigator
In the **Navigator** tree view, expand `sqldb-wishwell` $\rightarrow$ `dbo`, and check the 5 views:
- [x] `vw_wishes_by_category_month`
- [x] `vw_avg_delivery_time`
- [x] `vw_institutions_by_status`
- [x] `vw_stale_claim_rate`
- [x] `vw_top_categories`

Click **Load**. Power BI will import the views and construct the dataset.

---

## 4. Dataset Field Definitions

| View Name | Primary Fields | Description |
|---|---|---|
| `vw_wishes_by_category_month` | `month_year`, `category_name`, `wishes_posted`, `wishes_fulfilled`, `items_requested`, `items_fulfilled`, `fulfillment_rate_pct` | Tracks monthly demand vs fulfilled wishes by category over the 6-month historical window. |
| `vw_avg_delivery_time` | `month_year`, `category_name`, `completed_deliveries`, `avg_delivery_hours`, `avg_delivery_days`, `min_delivery_hours`, `max_delivery_hours` | Turnaround duration (in hours and days) from initial donor pledge to institution confirmation. |
| `vw_institutions_by_status` | `status`, `institution_count`, `total_institutions`, `percentage` | Onboarding verification funnel (`pending`, `recommended`, `verified`, `rejected`). |
| `vw_stale_claim_rate` | `month_year`, `category_name`, `total_claims`, `active_claims`, `delivered_claims`, `released_claims`, `expired_claims`, `stale_claim_rate_pct` | Platform responsiveness metric analyzing active vs expired pledges. |
| `vw_top_categories` | `category_name`, `wishes_count`, `total_items_requested`, `total_items_claimed`, `total_items_delivered`, `fulfillment_rate_pct`, `rank_by_demand` | Ranks item categories by demand volume and donor fulfillment efficiency. |

---

## 5. Recommended DAX Measures

To support dynamic filtering and accurate aggregations across multiple slicers, create these DAX measures (Right-click table $\rightarrow$ **New measure**):

```dax
// 1. Total Wishes Posted
Total Wishes Posted = SUM(vw_wishes_by_category_month[wishes_posted])

// 2. Total Wishes Fulfilled
Total Wishes Fulfilled = SUM(vw_wishes_by_category_month[wishes_fulfilled])

// 3. Dynamic Fulfillment Rate Percentage
Overall Fulfillment Rate = 
DIVIDE([Total Wishes Fulfilled], [Total Wishes Posted], 0)

// 4. Mean Delivery Turnaround Time (Hours)
Mean Delivery Turnaround Hours = 
AVERAGE(vw_avg_delivery_time[avg_delivery_hours])

// 5. Total Expired Stale Claims
Total Expired Claims = SUM(vw_stale_claim_rate[expired_claims])

// 6. Platform Stale Claim Rate Percentage
Platform Stale Claim Rate = 
DIVIDE(
    SUM(vw_stale_claim_rate[expired_claims]),
    SUM(vw_stale_claim_rate[total_claims]),
    0
)
```

---

## 6. Dashboard Layout & Visual Setup Guide

Create a single 16:9 canvas (1920x1080) with a modern header and 5 analytical cards.

```
+---------------------------------------------------------------------------------------------------+
|  [LOGO] WishWell Executive Analytics Dashboard                      Report Window: Last 6 Months  |
+---------------------------------------------------------------------------------------------------+
|  SLICERS: [ Category Slicer: All v ]            [ Month Slicer: 2025-11 to 2026-04 v ]            |
+------------------------------------------------+--------------------------------------------------+
|  VISUAL 1: Wishes Fulfilled by Month & Category|  VISUAL 2: Delivery Turnaround SLA               |
|  (Clustered Column & Line Chart)               |  (KPI Card + Horizontal Lead Time Bar Chart)     |
|                                                |                                                  |
|  • Bars: Wishes Posted vs Wishes Fulfilled     |  • KPI: 49.6 Hours (~2.1 Days)                   |
|  • Line: Fulfillment Rate %                    |  • Bars by Category: Health, Books, Bedding...   |
+------------------------------------------------+--------------------------------------------------+
|  VISUAL 3: Verification Funnel                 |  VISUAL 4: Stale-Claim Rate | VISUAL 5: Categories|
|  (Donut Chart)                                 |  (Radial Gauge Chart)       | (Performance Table)|
|                                                |                             |                    |
|  • Verified: 60%                               |  • Gauge Value: 16.6%       | • Category Ranking |
|  • Recommended: 20%                            |  • Green Target: < 20%      | • Fulfillment Rate |
|  • Pending: 20%                                |  • Over-claim safeguard     | • Items Delivered  |
+------------------------------------------------+-----------------------------+--------------------+
```

### Detailed Visual Configurations:

#### Slicers (Top Control Bar):
1. **Category Slicer**:
   * Field: `vw_wishes_by_category_month[category_name]`
   * Style: **Dropdown** or **Tile / Horizontal Buttons**.
2. **Month Slicer**:
   * Field: `vw_wishes_by_category_month[month_year]`
   * Style: **Between** (slider) or **Dropdown**.

---

#### Visual 1: Wishes Fulfilled by Category and Month
* **Visual Type**: **Line and Clustered Column Chart**
* **X-Axis**: `vw_wishes_by_category_month[month_year]`
* **Column Y-Axis**: 
  - `wishes_posted` (Color: Steel Blue `#4A90E2`)
  - `wishes_fulfilled` (Color: Emerald Green `#2ECC71`)
* **Line Y-Axis**: `fulfillment_rate_pct` (Color: Amber Orange `#F39C12`)
* **Formatting**: Enable Data Labels, show title `"Monthly Wish Demand vs Fulfillment Rate"`.

---

#### Visual 2: Average Delivery Turnaround Time (Hours)
* **Visual Type A (Top)**: **Card Visual**
  * Field: `[Mean Delivery Turnaround Hours]`
  * Callout Value: Format as `0.0 "Hrs"` (e.g. `48.5 Hrs`).
  * Sub-label: `"Average Donor Pledge to Verified Delivery Time"`.
* **Visual Type B (Bottom)**: **Clustered Bar Chart**
  * Y-Axis: `vw_avg_delivery_time[category_name]`
  * X-Axis: `vw_avg_delivery_time[avg_delivery_hours]`
  * Formatting: Sort descending by turnaround time.

---

#### Visual 3: Institutions by Verification Status
* **Visual Type**: **Donut Chart**
* **Legend**: `vw_institutions_by_status[status]`
* **Values**: `vw_institutions_by_status[institution_count]`
* **Colors**:
  - `verified`: Green (`#27AE60`)
  - `recommended`: Blue (`#2980B9`)
  - `pending`: Orange (`#E67E22`)
  - `rejected`: Crimson (`#C0392B`)
* **Detail Labels**: **Category, percent of total**.

---

#### Visual 4: Stale-Claim Rate
* **Visual Type**: **Gauge Chart**
* **Value**: `[Platform Stale Claim Rate]`
* **Minimum**: `0.0` (0%)
* **Maximum**: `0.5` (50%)
* **Target Value**: `0.15` (15% SLA threshold)
* **Formatting**: Red warning band above 20%, green below 15%. Demonstrates the automated 14-day expiry enforcement by `sp_release_stale_claims`.

---

#### Visual 5: Top Categories by Demand
* **Visual Type**: **Matrix / Table**
* **Rows**: `vw_top_categories[category_name]`
* **Values**:
  - `vw_top_categories[wishes_count]`
  - `vw_top_categories[total_items_requested]`
  - `vw_top_categories[total_items_delivered]`
  - `vw_top_categories[fulfillment_rate_pct]`
* **Conditional Formatting**: Add gradient data bars on `total_items_requested` and font color thresholds on `fulfillment_rate_pct`.

---

## 7. Viva Defense & Examination Talking Points

1. **Why create dedicated SQL Views instead of letting Power BI query base tables directly?**
   * *Security Abstraction*: Power BI users and report authors only need aggregated views, shielding raw personally identifiable information (PII) or sensitive institution records.
   * *Decoupling & Maintainability*: If the underlying 3NF schema evolves (e.g. adding columns or partitioning), the SQL Views maintain a stable interface contract for Power BI reports.
   * *Performance Optimization*: Analytical aggregations (e.g. `COUNT`, `DATEDIFF`, `OUTER APPLY`) execute natively on the SQL Server query engine with index utilization, reducing bandwidth and client memory pressure.

2. **Why use a dedicated read-only database user (`powerbi_reader`)?**
   * *Principle of Least Privilege*: Reporting tools only require read capabilities. Granting `powerbi_reader` `SELECT` only with explicit `DENY INSERT, UPDATE, DELETE` guarantees that BI reports or compromised connection strings cannot mutate or drop database state.

3. **DirectQuery vs Import: Which is better on Azure SQL Serverless?**
   * *Import Mode*: Downloads a snapshot into Power BI VertiPaq memory. It is ideal for student/low-cost deployments because once loaded, users can interact with slicers even when the Azure SQL Serverless database enters auto-pause ($0 compute cost during exploration).
   * *DirectQuery Mode*: Emits live T-SQL queries per click. It ensures instant freshness for real-time operations, but requires the database to remain warm and responsive.

4. **How does the 6-month historical dataset demonstrate system invariants?**
   * It populates 300 wishes across all 6 categories, 150 donor claims, and 100 deliveries.
   * It reflects real-world operational variance: 85% completed fulfillment, 15% stale claim expirations (proving the automated 14-day expiry engine), and realistic delivery turnaround times averaging ~48 hours.

